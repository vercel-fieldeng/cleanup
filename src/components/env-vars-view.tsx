"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useToken } from "@/components/token-provider";
import type { VercelEnvVar, VercelProject } from "@/lib/types";
import {
  deleteEnvVar,
  fetchAllProjects,
  fetchEnvVarDecrypted,
  fetchEnvVars,
  revokeOpenAIKey,
} from "@/lib/vercel-api";

const RECOMMENDED_FILTERS: { label: string; patterns: string[] }[] = [
  { label: "DATABASE", patterns: ["DATABASE", "DB"] },
  { label: "POSTGRES", patterns: ["POSTGRES", "PG"] },
  { label: "TOKEN", patterns: ["TOKEN"] },
  { label: "SECRET", patterns: ["SECRET"] },
  { label: "KEY", patterns: ["KEY"] },
  { label: "OPENAI_API_KEY", patterns: ["OPENAI_API_KEY"] },
  { label: "AI_GATEWAY_TOKEN", patterns: ["AI_GATEWAY_TOKEN"] },
  { label: "BETTER_AUTH_SECRET", patterns: ["BETTER_AUTH_SECRET"] },
];

const BATCH_SIZE = 50;

type ProjectEnvGroup = {
  project: VercelProject;
  envVars: VercelEnvVar[];
};

export function EnvVarsView() {
  const { token, team } = useToken();
  const [projects, setProjects] = useState<VercelProject[]>([]);
  const [envMap, setEnvMap] = useState<Map<string, VercelEnvVar[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [revoking, setRevoking] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [decryptedValues, setDecryptedValues] = useState<Map<string, string>>(new Map());
  const [decrypting, setDecrypting] = useState<Set<string>>(new Set());

  const opts = useMemo(
    () => (token ? { token, teamId: team?.id } : null),
    [token, team],
  );

  const load = useCallback(async () => {
    if (!opts) return;
    setLoading(true);
    setError(null);

    try {
      const rawProjects = await fetchAllProjects(opts);
      const projectList = rawProjects as unknown as VercelProject[];
      setProjects(projectList);

      // fetch env vars in batches of 50
      const map = new Map<string, VercelEnvVar[]>();
      for (let i = 0; i < projectList.length; i += BATCH_SIZE) {
        const batch = projectList.slice(i, i + BATCH_SIZE);
        setLoadProgress(`${Math.min(i + BATCH_SIZE, projectList.length)}/${projectList.length} projects`);

        const results = await Promise.allSettled(
          batch.map(async (p) => {
            const data = await fetchEnvVars(p.id, opts);
            return { projectId: p.id, envs: (data.envs ?? []) as unknown as VercelEnvVar[] };
          }),
        );

        for (const result of results) {
          if (result.status === "fulfilled") {
            map.set(result.value.projectId, result.value.envs);
          }
        }
        setEnvMap(new Map(map));
      }

      setLoadProgress(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [opts]);

  useEffect(() => {
    load();
  }, [load]);

  const activePatterns = useMemo(() => {
    const patterns: string[] = [];
    for (const label of activeFilters) {
      const f = RECOMMENDED_FILTERS.find((r) => r.label === label);
      if (f) patterns.push(...f.patterns);
      else patterns.push(label);
    }
    if (search) patterns.push(search.toUpperCase());
    return patterns.length > 0 ? patterns : null;
  }, [activeFilters, search]);

  const groups = useMemo(() => {
    const result: ProjectEnvGroup[] = [];

    for (const project of projects) {
      const envs = envMap.get(project.id) ?? [];
      const filtered = activePatterns
        ? envs.filter((e) => {
            const upper = e.key.toUpperCase();
            return activePatterns.some((p) => upper.includes(p));
          })
        : envs;
      if (filtered.length > 0) {
        result.push({ project, envVars: filtered });
      }
    }

    return result.sort((a, b) => a.project.name.localeCompare(b.project.name));
  }, [projects, envMap, activePatterns]);

  const totalVars = useMemo(
    () => groups.reduce((sum, g) => sum + g.envVars.length, 0),
    [groups],
  );

  async function handleExpand(projectId: string, env: VercelEnvVar) {
    const rowKey = `${projectId}:${env.id}`;
    if (expanded === rowKey) {
      setExpanded(null);
      return;
    }
    setExpanded(rowKey);

    if (decryptedValues.has(rowKey) || !opts) return;
    setDecrypting((prev) => new Set(prev).add(rowKey));
    try {
      const data = await fetchEnvVarDecrypted(projectId, env.id, opts);
      setDecryptedValues((prev) => new Map(prev).set(rowKey, (data.value as string) ?? ""));
    } catch {
      setDecryptedValues((prev) => new Map(prev).set(rowKey, "(failed to decrypt)"));
    } finally {
      setDecrypting((prev) => {
        const next = new Set(prev);
        next.delete(rowKey);
        return next;
      });
    }
  }

  async function handleRevokeAndDelete(projectId: string, env: VercelEnvVar) {
    if (!opts) return;
    const key = `${projectId}:${env.id}`;
    if (!window.confirm(`Revoke and delete ${env.key} from this project? This cannot be undone.`)) return;

    setRevoking((prev) => new Set(prev).add(key));
    try {
      // fetch decrypted value, then revoke at openai
      const decrypted = await fetchEnvVarDecrypted(projectId, env.id, opts);
      const value = (decrypted.value ?? env.value) as string;
      await revokeOpenAIKey(value);
      // then delete the env var
      await deleteEnvVar(projectId, env.id, opts);
      setEnvMap((prev) => {
        const next = new Map(prev);
        const envs = next.get(projectId) ?? [];
        next.set(projectId, envs.filter((e) => e.id !== env.id));
        return next;
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to revoke and delete");
    } finally {
      setRevoking((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  async function handleDelete(projectId: string, envId: string) {
    if (!opts) return;
    const key = `${projectId}:${envId}`;
    setRevoking((prev) => new Set(prev).add(key));
    try {
      await deleteEnvVar(projectId, envId, opts);
      setEnvMap((prev) => {
        const next = new Map(prev);
        const envs = next.get(projectId) ?? [];
        next.set(projectId, envs.filter((e) => e.id !== envId));
        return next;
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setRevoking((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 px-6 py-8">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Environment Variables</h1>
          <div className="h-3.5 w-28 animate-pulse rounded bg-surface-hover" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-7 w-28 animate-pulse rounded bg-surface-hover" />
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-border bg-surface">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="h-4 w-36 animate-pulse rounded bg-surface-hover" />
            </div>
            <div className="divide-y divide-border border-t border-border">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center gap-4 px-4 py-2.5">
                  <div className="h-3.5 w-44 animate-pulse rounded bg-surface-hover" />
                  <div className="h-3.5 w-20 animate-pulse rounded bg-surface-hover" />
                  <div className="h-3.5 w-16 animate-pulse rounded bg-surface-hover" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="text-danger text-sm">{error}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-auto px-6 py-8">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Environment Variables</h1>
        <span className="font-mono text-text-tertiary text-xs">
          {loadProgress ?? (
            <>
              {groups.length} project{groups.length !== 1 ? "s" : ""}
              {" · "}
              {totalVars} var{totalVars !== 1 ? "s" : ""}
            </>
          )}
        </span>
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by key name..."
          className="h-8 border border-border bg-surface px-3 font-mono text-xs text-text placeholder:text-text-tertiary focus:border-text-tertiary focus:outline-none"
        />
        {RECOMMENDED_FILTERS.map((f) => {
          const isActive = activeFilters.has(f.label);
          return (
            <button
              key={f.label}
              type="button"
              onClick={() => {
                setActiveFilters((prev) => {
                  const next = new Set(prev);
                  if (next.has(f.label)) next.delete(f.label);
                  else next.add(f.label);
                  return next;
                });
              }}
              className={`h-8 border px-3 font-mono text-xs transition-colors ${
                isActive
                  ? "border-text bg-text text-bg"
                  : "border-border bg-surface text-text-secondary hover:text-text"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {groups.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <span className="text-text-secondary text-sm">
            {search || activeFilters.size > 0 ? "No matching environment variables" : "No environment variables found"}
          </span>
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.project.id} className="border border-border bg-surface">
            <div className="flex min-h-10 items-center gap-3 px-4">
              <Link href={`/projects/${group.project.id}`} className="text-sm font-medium hover:underline">{group.project.name}</Link>
              <span className="font-mono text-text-tertiary text-[10px]">
                {group.envVars.length} var{group.envVars.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="divide-y divide-border border-t border-border">
              {group.envVars.map((env) => {
                const rowKey = `${group.project.id}:${env.id}`;
                const isRevoking = revoking.has(rowKey);
                const isOpenAI = env.key === "OPENAI_API_KEY";
                const isSensitive = env.type === "sensitive" || env.type === "secret";
                const canExpand = !isSensitive;
                const canRevoke = isOpenAI && !isSensitive;

                const isExpanded = expanded === rowKey;
                const decryptedValue = decryptedValues.get(rowKey);
                const isDecrypting = decrypting.has(rowKey);

                return (
                  <div key={env.id} className={isRevoking ? "opacity-50" : ""}>
                    <div
                      className={`group flex items-center gap-4 px-4 py-2.5 transition-colors ${canExpand ? "cursor-pointer hover:bg-surface-hover" : ""}`}
                      onClick={canExpand ? () => handleExpand(group.project.id, env) : undefined}
                    >
                      <span className="shrink-0 font-mono text-xs text-text">{env.key}</span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {env.target.map((t) => (
                          <span
                            key={t}
                            className="border border-border px-1.5 py-0.5 font-mono text-[10px] text-text-tertiary"
                          >
                            {t}
                          </span>
                        ))}
                        {isSensitive && (
                          <span className="border border-warning/40 bg-warning/10 px-1.5 py-0.5 font-mono text-[10px] text-warning">
                            sensitive
                          </span>
                        )}
                      </div>
                      <div className="ml-auto flex shrink-0 items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                        {canRevoke && (
                          <button
                            type="button"
                            disabled={isRevoking}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRevokeAndDelete(group.project.id, env);
                            }}
                            className="border border-danger px-2.5 py-1 text-xs text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                          >
                            {isRevoking ? "Revoking…" : "Revoke & Delete"}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isRevoking}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(group.project.id, env.id);
                          }}
                          className="p-1 text-text-tertiary transition-colors hover:text-danger disabled:opacity-50"
                          title="Delete"
                        >
                          <TrashIcon size={12} />
                        </button>
                      </div>
                    </div>
                    {isExpanded && canExpand && (
                      <div className="border-t border-border bg-bg px-4 py-2.5">
                        {isDecrypting ? (
                          <span className="font-mono text-text-tertiary text-xs">Decrypting…</span>
                        ) : (
                          <pre className="overflow-x-auto whitespace-pre font-mono text-text-secondary text-xs">
                            {decryptedValue ?? ""}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

    </div>
  );
}

function TrashIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h12M5 4V2.5a.5.5 0 01.5-.5h5a.5.5 0 01.5.5V4M6.5 7v4.5M9.5 7v4.5" />
      <path d="M3 4l.5 9.5a1 1 0 001 .5h7a1 1 0 001-.5L13 4" />
    </svg>
  );
}
