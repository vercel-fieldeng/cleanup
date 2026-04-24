"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type SyntheticEvent } from "react";

import { ProjectDetailSkeleton } from "@/components/project-detail-skeleton";
import { Section } from "@/components/section";
import { useToken } from "@/components/token-provider";
import { PROVIDER_LOGOS } from "@/lib/provider-logos";
import type {
  VercelDeployment,
  VercelEnvVar,
  VercelIntegration,
  VercelProject,
  VercelStore,
} from "@/lib/types";
import {
  deleteEnvVar,
  deleteIntegrationConfig,
  deleteProject,
  fetchDeployments,
  fetchEnvVarDecrypted,
  fetchEnvVars,
  fetchIntegrations,
  fetchProject,
  fetchStores,
  revokeOpenAIKey,
} from "@/lib/vercel-api";

type ConnectedIntegration = VercelIntegration & {
  injectedKeys: string[];
};

export function ProjectDetail({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { token, team, user } = useToken();
  const [project, setProject] = useState<VercelProject | null>(null);
  const [deployments, setDeployments] = useState<VercelDeployment[]>([]);
  const [envVars, setEnvVars] = useState<VercelEnvVar[]>([]);
  const [connectedIntegrations, setConnectedIntegrations] = useState<ConnectedIntegration[]>([]);
  const [connectedStores, setConnectedStores] = useState<VercelStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  const opts = useMemo(
    () => (token ? { token, teamId: team?.id } : null),
    [token, team],
  );

  useEffect(() => {
    if (!opts) return;
    setLoading(true);
    setError(null);
    setStatusCode(null);

    Promise.all([
      fetchProject(projectId, opts),
      fetchDeployments(projectId, opts),
      fetchEnvVars(projectId, opts).catch(() => ({ envs: [] })),
      fetchIntegrations(opts).catch(() => []),
      fetchStores(opts).catch(() => ({ stores: [] })),
    ])
      .then(([proj, deps, env, intgs, rawStores]) => {
        setProject(proj as unknown as VercelProject);
        setDeployments(
          (deps.deployments ?? []) as unknown as VercelDeployment[],
        );
        const envList = (env.envs ?? []) as unknown as VercelEnvVar[];
        setEnvVars(envList);
        const allIntegrations = (
          Array.isArray(intgs) ? intgs : []
        ) as unknown as VercelIntegration[];

        // derive connected integrations via env var configurationId
        const configIds = new Set<string>();
        for (const e of envList) {
          if (e.configurationId) configIds.add(e.configurationId);
        }
        const matched = allIntegrations.filter((i) => configIds.has(i.id));

        const enriched: ConnectedIntegration[] = matched.map((intg) => {
          const injectedKeys = envList
            .filter((e) => e.configurationId === intg.id)
            .map((e) => e.key);
          return { ...intg, injectedKeys };
        });

        setConnectedIntegrations(enriched);

        // filter stores connected to this project
        const allStores = (rawStores.stores ?? []) as unknown as VercelStore[];
        const projectStores = allStores.filter((s) =>
          s.projectsMetadata.some((p) => p.projectId === projectId),
        );
        setConnectedStores(projectStores);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Failed to load";
        setError(msg);
        const match = msg.match(/Vercel API (\d+)/);
        if (match) setStatusCode(Number(match[1]));
      })
      .finally(() => setLoading(false));
  }, [opts, projectId]);

  async function handleRevokeAndDeleteEnv(env: VercelEnvVar) {
    if (!opts) return;
    if (!window.confirm(`Revoke and delete ${env.key}? This cannot be undone.`)) return;
    const key = `env:${env.id}`;
    setDeleting((prev) => new Set(prev).add(key));
    try {
      const decrypted = await fetchEnvVarDecrypted(projectId, env.id, opts);
      const value = (decrypted.value ?? env.value) as string;
      await revokeOpenAIKey(value);
      await deleteEnvVar(projectId, env.id, opts);
      setEnvVars((prev) => prev.filter((e) => e.id !== env.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to revoke and delete");
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  async function handleDeleteEnv(envId: string) {
    if (!opts) return;
    if (!window.confirm("Delete this environment variable? This cannot be undone.")) return;
    const key = `env:${envId}`;
    setDeleting((prev) => new Set(prev).add(key));
    try {
      await deleteEnvVar(projectId, envId, opts);
      setEnvVars((prev) => prev.filter((e) => e.id !== envId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  async function handleDeleteProject() {
    if (!opts || !project) return;
    if (!window.confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    setDeleting((prev) => new Set(prev).add("project"));
    try {
      await deleteProject(projectId, opts);
      router.push("/");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete project");
      setDeleting((prev) => {
        const next = new Set(prev);
        next.delete("project");
        return next;
      });
    }
  }

  async function handleDeleteIntegration(configId: string) {
    if (!opts) return;
    if (!window.confirm("Remove this integration? This cannot be undone.")) return;
    setDeleting((prev) => new Set(prev).add(configId));
    try {
      await deleteIntegrationConfig(configId, opts);
      setConnectedIntegrations((prev) => prev.filter((c) => c.id !== configId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev);
        next.delete(configId);
        return next;
      });
    }
  }

  if (loading) {
    return <ProjectDetailSkeleton />;
  }

  if (error || !project) {
    const is404 = statusCode === 404;
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-5">
        <div className="flex h-16 w-16 items-center justify-center border border-border bg-surface">
          <span className="font-mono text-2xl text-text-tertiary">
            {is404 ? "404" : "!"}
          </span>
        </div>
        <h2 className="text-base font-semibold">
          {is404 ? "Project not found" : "Failed to load project"}
        </h2>
        <p className="max-w-md text-center text-text-secondary text-sm">
          {is404
            ? `The project "${projectId}" doesn't exist or your token doesn't have access to it in the ${team?.name ?? "personal"} scope.`
            : error}
        </p>
        <div className="flex gap-3">
          <Link
            href="/"
            className="flex h-8 items-center border border-border px-4 text-sm transition-colors hover:bg-surface-hover"
          >
            Back to projects
          </Link>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex h-8 items-center border border-border px-4 text-sm transition-colors hover:bg-surface-hover"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const gitEditors = [
    ...new Set(
      deployments
        .map((d) => d.meta?.githubCommitAuthorLogin ?? d.creator?.username)
        .filter(Boolean),
    ),
  ];

  const ownerSlug = team?.slug ?? user?.username;
  const vercelUrl = ownerSlug
    ? `https://vercel.com/${ownerSlug}/${project.name}`
    : null;

  return (
    <div className="px-6 py-8">
      {/* breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-text-secondary text-sm">
        <Link href="/" className="hover:text-text">
          Projects
        </Link>
        <span className="text-text-tertiary">/</span>
        <span className="text-text">{project.name}</span>
      </div>

      {/* project header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{project.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-text-secondary text-xs">
            {project.framework && (
              <span className="inline-flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 1.5h-7a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-11a1 1 0 0 0-1-1z" /><path d="M6.5 5h3M6.5 8h3M6.5 11h1.5" /></svg>
                {project.framework}
              </span>
            )}
            {project.link && (
              <a
                href={`https://github.com/${project.link.repo}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-text hover:underline"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" /></svg>
                {project.link.repo}
              </a>
            )}
            <span className="inline-flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="12" height="12" rx="1" /><path d="M2 6h12M5 2v2M11 2v2" /></svg>
              {formatDate(project.createdAt)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {vercelUrl && (
            <a
              href={vercelUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-8 items-center gap-2 border border-border px-3 text-sm transition-colors hover:bg-surface-hover"
            >
              <svg
                height="12"
                viewBox="0 0 76 65"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
              </svg>
              View on Vercel
            </a>
          )}
          <button
            type="button"
            disabled={deleting.has("project")}
            onClick={handleDeleteProject}
            className="flex h-8 items-center gap-2 border border-danger px-3 text-sm text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
          >
            {deleting.has("project") ? "Deleting…" : "Delete Project"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* recent deployments */}
        <Section title="Recent Deployments" count={deployments.length} href={vercelUrl ? `${vercelUrl}/deployments` : null}>
          {deployments.length === 0 ? (
            <Empty>No deployments</Empty>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {deployments.map((d) => (
                <div key={d.uid} className="flex items-center gap-3 py-2.5">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <StatusDot state={d.state} />
                      <span className="text-sm break-all">
                        {d.meta?.githubCommitMessage?.slice(0, 60) ??
                          d.url ??
                          d.uid.slice(0, 8)}
                      </span>
                    </div>
                    <div className="flex items-center gap-x-5 pl-4 font-mono text-text-tertiary text-xs">
                      <span className="inline-flex w-[120px] shrink-0 items-center gap-1">
                        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="12" height="12" rx="1" /><path d="M2 6h12M5 2v2M11 2v2" /></svg>
                        {formatDate(d.created)}
                      </span>
                      <span className="inline-flex w-[120px] shrink-0 items-center gap-1">
                        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6" /><path d="M2 8h12M8 2a10 10 0 0 1 0 12M8 2a10 10 0 0 0 0 12" /></svg>
                        {d.target ?? "preview"}
                      </span>
                      {d.meta?.githubCommitRef && (
                        <span className="inline-flex w-[180px] shrink-0 items-center gap-1 truncate">
                          <svg className="shrink-0" width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="4" r="2" /><circle cx="11" cy="12" r="2" /><path d="M5 6v4c0 1.1.9 2 2 2h4" /></svg>
                          <span className="truncate">{d.meta.githubCommitRef}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  {(d.meta?.githubCommitAuthorLogin ?? d.creator?.username) && (
                    <Avatar
                      src={gitAvatarUrl(d.meta?.githubCommitAuthorLogin ?? d.creator?.username ?? "", 20)}
                      name={d.meta?.githubCommitAuthorLogin ?? d.creator?.username ?? ""}
                      size={20}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* environment variables */}
        <Section title="Environment Variables" count={envVars.length} href={vercelUrl ? `${vercelUrl}/settings/environment-variables` : null}>
          {envVars.length === 0 ? (
            <Empty>No environment variables</Empty>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {envVars.map((env) => {
                const isOpenAI = env.key === "OPENAI_API_KEY";
                const isSensitive = env.type === "sensitive" || env.type === "secret";
                const canRevoke = isOpenAI && !isSensitive;
                const envDeleting = deleting.has(`env:${env.id}`);
                return (
                  <div
                    key={env.id}
                    className={`group flex items-start justify-between gap-4 py-2.5 ${envDeleting ? "opacity-50" : ""}`}
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-mono text-sm">{env.key}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-text-tertiary text-[10px]">
                          {env.target?.join(", ")}
                        </span>
                        {isSensitive && (
                          <span className="border border-warning/40 bg-warning/10 px-1 font-mono text-warning text-[10px]">
                            sensitive
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 opacity-0 transition-opacity group-hover:opacity-100">
                      {canRevoke && (
                        <button
                          type="button"
                          disabled={envDeleting}
                          onClick={() => handleRevokeAndDeleteEnv(env)}
                          className="border border-danger px-2.5 py-1 text-xs text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                        >
                          {envDeleting ? "Revoking…" : "Revoke & Delete"}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={envDeleting}
                        onClick={() => handleDeleteEnv(env.id)}
                        className="p-1 text-text-tertiary transition-colors hover:text-danger disabled:opacity-50"
                        title="Delete"
                      >
                        <EnvTrashIcon />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* integrations + stores */}
        <Section title="Integrations" count={connectedIntegrations.length + connectedStores.length} href={vercelUrl ? `${vercelUrl}/stores` : null}>
          {connectedIntegrations.length === 0 && connectedStores.length === 0 ? (
            <Empty>No integrations linked</Empty>
          ) : (
            <IntegrationStoreList
              integrations={connectedIntegrations}
              stores={connectedStores}
              projectId={projectId}
              deleting={deleting}
              onDelete={handleDeleteIntegration}
            />
          )}
        </Section>

        {/* git editors */}
        <Section title="Git Editors" count={gitEditors.length} href={project.link ? `https://github.com/${project.link.repo}/graphs/contributors` : null}>
          {gitEditors.length === 0 ? (
            <Empty>No editors found</Empty>
          ) : (
            <div className="flex flex-wrap gap-2">
              {gitEditors.map((editor) => (
                <a
                  key={editor}
                  href={`https://github.com/${editor}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 border border-border px-3 py-1.5 font-mono text-xs transition-colors hover:bg-surface-hover"
                >
                  <Avatar
                    src={gitAvatarUrl(editor, 16)}
                    name={editor}
                    size={16}
                  />
                  {editor}
                </a>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

const STORE_TYPE_TO_SLUGS: Record<string, string[]> = {
  postgres: ["neon", "supabase"],
  kv: ["upstash", "redis"],
  redis: ["upstash", "redis"],
};
const FIRST_PARTY_TYPES = new Set(["blob", "edge-config"]);
const FIRST_PARTY_LABELS: Record<string, string> = {
  blob: "Vercel Blob",
  "edge-config": "Edge Config",
};

function IntegrationStoreList({
  integrations,
  stores,
  projectId,
  deleting,
  onDelete,
}: {
  integrations: ConnectedIntegration[];
  stores: VercelStore[];
  projectId: string;
  deleting: Set<string>;
  onDelete: (id: string) => void;
}) {
  // group marketplace stores under their parent integration
  const slugSet = new Set(integrations.map((i) => i.slug));
  const storesBySlug = new Map<string, VercelStore[]>();
  const firstPartyStores = new Map<string, VercelStore[]>();

  for (const store of stores) {
    if (FIRST_PARTY_TYPES.has(store.type)) {
      const list = firstPartyStores.get(store.type) ?? [];
      list.push(store);
      firstPartyStores.set(store.type, list);
      continue;
    }
    const candidateSlugs = STORE_TYPE_TO_SLUGS[store.type] ?? [];
    const matched = candidateSlugs.find((s) => slugSet.has(s));
    if (matched) {
      const list = storesBySlug.get(matched) ?? [];
      list.push(store);
      storesBySlug.set(matched, list);
    }
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {integrations.map((intg) => {
        const displayName = intg.integration?.name ?? intg.slug;
        const iconUrl = intg.integration?.icon;
        const isDeleting = deleting.has(intg.id);
        const relatedStores = storesBySlug.get(intg.slug) ?? [];

        return (
          <div key={intg.id}>
            <div className="group flex flex-col gap-2 py-2.5">
              <div className="flex items-center gap-3">
                <ProviderIcon slug={intg.slug} iconUrl={iconUrl} size={24} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">{displayName}</span>
                  {intg.externalId && (
                    <span className="font-mono text-[10px] text-text-tertiary">{intg.externalId}</span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => onDelete(intg.id)}
                  className="shrink-0 p-1 text-text-tertiary opacity-0 transition-all hover:text-danger group-hover:opacity-100 disabled:opacity-50"
                  title="Remove integration"
                >
                  {isDeleting ? (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="animate-spin"><circle cx="8" cy="8" r="6" strokeDasharray="28" strokeDashoffset="8" /></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4h12M5 4V2.5a.5.5 0 01.5-.5h5a.5.5 0 01.5.5V4M6.5 7v4.5M9.5 7v4.5" /><path d="M3 4l.5 9.5a1 1 0 001 .5h7a1 1 0 001-.5L13 4" /></svg>
                  )}
                </button>
              </div>
              {intg.injectedKeys.length > 0 && (
                <div className="flex flex-wrap gap-1 pl-9">
                  {intg.injectedKeys.map((k) => (
                    <span key={k} className="border border-border px-1.5 py-px font-mono text-text-tertiary text-[10px]">{k}</span>
                  ))}
                </div>
              )}
              {relatedStores.length > 0 && (
                <div className="flex flex-col gap-1.5 pl-9">
                  {relatedStores.map((store) => {
                    const meta = store.projectsMetadata.find((p) => p.projectId === projectId);
                    return (
                      <div key={store.id} className="flex flex-col gap-1">
                        <span className="font-mono text-[11px] text-text-secondary">{store.name}</span>
                        {meta && meta.environmentVariables.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {meta.environmentVariables.map((k) => (
                              <span key={k} className="border border-border px-1.5 py-px font-mono text-text-tertiary text-[10px]">{k}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
      {[...firstPartyStores.entries()].map(([type, typeStores]) => (
        <div key={type} className="flex flex-col gap-2 py-2.5">
          <div className="flex items-center gap-3">
            <ProviderIcon slug={type} size={24} />
            <span className="text-sm font-medium">{FIRST_PARTY_LABELS[type] ?? type}</span>
          </div>
          <div className="flex flex-col gap-1.5 pl-9">
            {typeStores.map((store) => {
              const meta = store.projectsMetadata.find((p) => p.projectId === projectId);
              return (
                <div key={store.id} className="flex flex-col gap-1">
                  <span className="font-mono text-[11px] text-text-secondary">{store.name}</span>
                  {meta && meta.environmentVariables.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {meta.environmentVariables.map((k) => (
                        <span key={k} className="border border-border px-1.5 py-px font-mono text-text-tertiary text-[10px]">{k}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-4 text-center text-text-tertiary text-sm">{children}</p>
  );
}

function StatusDot({ state }: { state: string }) {
  const color =
    state === "READY"
      ? "bg-success"
      : state === "ERROR" || state === "CANCELED"
        ? "bg-danger"
        : "bg-warning";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

const BOT_AVATAR_IDS: Record<string, number> = {
  "vercel[bot]": 35613825,
  "v0[bot]": 196351893,
  "dependabot[bot]": 49699333,
  "renovate[bot]": 29139614,
  "github-actions[bot]": 65916846,
};

function gitAvatarUrl(username: string, displaySize: number): string {
  const botId = BOT_AVATAR_IDS[username];
  if (botId) return `https://avatars.githubusercontent.com/in/${botId}?s=${displaySize * 2}`;
  return `https://github.com/${username}.png?size=${displaySize * 2}`;
}

function Avatar({ src, name, size }: { src: string; name: string; size: number }) {
  const [failed, setFailed] = useState(false);
  const initial = name.charAt(0).toUpperCase();

  if (failed) {
    return (
      <span
        title={name}
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-surface-hover font-mono text-text-tertiary"
        style={{ width: size, height: size, fontSize: size * 0.45 }}
      >
        {initial}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      title={name}
      width={size}
      height={size}
      className="shrink-0 rounded-full"
      onError={(e: SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.onerror = null;
        setFailed(true);
      }}
    />
  );
}

function ProviderIcon({ slug, iconUrl, size }: { slug: string; iconUrl?: string; size: number }) {
  const [imgFailed, setImgFailed] = useState(false);
  const inlineSvg = PROVIDER_LOGOS[slug];

  if (iconUrl && !imgFailed) {
    return (
      <img
        src={iconUrl}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded"
        onError={() => setImgFailed(true)}
      />
    );
  }

  if (inlineSvg) {
    return (
      <span
        className="inline-flex shrink-0 rounded"
        style={{ width: size, height: size }}
        dangerouslySetInnerHTML={{ __html: inlineSvg }}
      />
    );
  }

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded bg-surface-hover font-mono text-text-tertiary"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {slug.charAt(0).toUpperCase()}
    </span>
  );
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function EnvTrashIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h12M5 4V2.5a.5.5 0 01.5-.5h5a.5.5 0 01.5.5V4M6.5 7v4.5M9.5 7v4.5" />
      <path d="M3 4l.5 9.5a1 1 0 001 .5h7a1 1 0 001-.5L13 4" />
    </svg>
  );
}
