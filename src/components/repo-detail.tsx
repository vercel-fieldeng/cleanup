"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  type SyntheticEvent,
  useEffect,
  useState,
} from "react";

import {
  Calendar as CalendarIcon,
  FileText as FrameworkIcon,
  GitBranch as BranchIcon,
  Globe as GlobeIcon,
  Lock as LockIcon,
  Star as StarIcon,
} from "lucide-react";
import { Section } from "@/components/section";
import { useToken } from "@/components/token-provider";
import {
  archiveRepo,
  deleteRepo,
  fetchRepo,
  fetchRepoCommits,
  fetchRepoContributors,
  fetchRepoReadme,
} from "@/lib/github-api";
import type {
  GitHubCommit,
  GitHubContributor,
  GitHubRepo,
} from "@/lib/github-types";

export function RepoDetail({ owner, repo }: { owner: string; repo: string }) {
  const router = useRouter();
  const { githubToken } = useToken();
  const [repoData, setRepoData] = useState<GitHubRepo | null>(null);
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [contributors, setContributors] = useState<GitHubContributor[]>([]);
  const [readme, setReadme] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [archivingState, setArchivingState] = useState(false);

  useEffect(() => {
    if (!githubToken) return;
    setLoading(true);
    setError(null);
    setStatusCode(null);

    const opts = { token: githubToken };

    Promise.all([
      fetchRepo(owner, repo, opts),
      fetchRepoCommits(owner, repo, opts).catch(() => []),
      fetchRepoContributors(owner, repo, opts).catch(() => []),
      fetchRepoReadme(owner, repo, opts).catch(() => null),
    ])
      .then(([repoResult, commitsResult, contribResult, readmeResult]) => {
        setRepoData(repoResult as unknown as GitHubRepo);
        setCommits(commitsResult as unknown as GitHubCommit[]);
        setContributors(contribResult as unknown as GitHubContributor[]);
        setReadme(readmeResult as string | null);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Failed to load";
        setError(msg);
        const match = msg.match(/GitHub API (\d+)/);
        if (match) setStatusCode(Number(match[1]));
      })
      .finally(() => setLoading(false));
  }, [githubToken, owner, repo]);

  async function handleArchive() {
    if (!githubToken || !repoData) return;
    if (
      !window.confirm(
        `Archive "${repoData.name}"? This will make it read-only.`,
      )
    )
      return;
    setArchivingState(true);
    try {
      await archiveRepo(owner, repo, { token: githubToken });
      setRepoData((prev) => (prev ? { ...prev, archived: true } : prev));
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to archive repository",
      );
    } finally {
      setArchivingState(false);
    }
  }

  async function handleDelete() {
    if (!githubToken || !repoData) return;
    if (!window.confirm(`Delete "${repoData.name}"? This cannot be undone.`))
      return;
    setDeleting(true);
    try {
      await deleteRepo(owner, repo, { token: githubToken });
      router.push("/github/repos");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete repository");
      setDeleting(false);
    }
  }

  if (loading) {
    return <RepoDetailSkeleton />;
  }

  if (error || !repoData) {
    const is404 = statusCode === 404;
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-5">
        <div className="flex h-16 w-16 items-center justify-center border border-border bg-surface">
          <span className="font-mono text-2xl text-text-tertiary">
            {is404 ? "404" : "!"}
          </span>
        </div>
        <h2 className="font-semibold text-base">
          {is404 ? "Repository not found" : "Failed to load repository"}
        </h2>
        <p className="max-w-md text-center text-sm text-text-secondary">
          {is404
            ? `The repository "${owner}/${repo}" doesn't exist or your token doesn't have access to it.`
            : error}
        </p>
        <div className="flex gap-3">
          <Link
            href="/github/repos"
            className="flex h-8 items-center border border-border px-4 text-sm transition-colors hover:bg-surface-hover"
          >
            Back to repositories
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

  return (
    <div className="px-6 py-8">
      {/* breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-text-secondary">
        <Link href="/github/repos" className="hover:text-text">
          Repositories
        </Link>
        <span className="text-text-tertiary">/</span>
        <span className="text-text">
          {owner}/{repo}
        </span>
      </div>

      {/* repo header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-semibold text-xl">{repoData.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-text-secondary text-xs">
            {repoData.language && (
              <span className="inline-flex items-center gap-1.5">
                <FrameworkIcon size={12} />
                {repoData.language}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              {repoData.private ? (
                <LockIcon size={12} />
              ) : (
                <GlobeIcon size={12} />
              )}
              {repoData.private ? "Private" : "Public"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarIcon size={12} />
              {formatDate(repoData.created_at)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <StarIcon size={12} />
              {repoData.stargazers_count}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BranchIcon size={12} />
              {repoData.default_branch}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <a
            href={repoData.html_url}
            target="_blank"
            rel="noreferrer"
            className="flex h-8 items-center gap-2 border border-border px-3 text-sm transition-colors hover:bg-surface-hover"
          >
            <svg width={12} height={12} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" /></svg>
            View on GitHub
          </a>
          {!repoData.archived && (
            <button
              type="button"
              disabled={archivingState}
              onClick={handleArchive}
              className="flex h-8 items-center gap-2 border border-warning px-3 text-sm text-warning transition-colors hover:bg-warning/10 disabled:opacity-50"
            >
              {archivingState ? "Archiving…" : "Archive"}
            </button>
          )}
          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="flex h-8 items-center gap-2 border border-danger px-3 text-danger text-sm transition-colors hover:bg-danger/10 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete Repository"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* recent commits */}
        <Section
          title="Recent Commits"
          count={commits.length}
          href={`${repoData.html_url}/commits`}
        >
          {commits.length === 0 ? (
            <Empty>No commits found</Empty>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {commits.map((c) => (
                <div key={c.sha} className="flex items-center gap-3 py-2.5">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <a
                        href={c.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-sm hover:underline"
                      >
                        {c.commit.message.slice(0, 60)}
                        {c.commit.message.length > 60 ? "…" : ""}
                      </a>
                    </div>
                    <div className="flex items-center gap-x-5 font-mono text-text-tertiary text-xs">
                      <span className="inline-flex w-[120px] shrink-0 items-center gap-1">
                        <CalendarIcon size={11} />
                        {formatDate(c.commit.author.date)}
                      </span>
                      <span className="truncate">
                        {c.author?.login ?? c.commit.author.name}
                      </span>
                    </div>
                  </div>
                  {c.author && (
                    <Avatar
                      src={c.author.avatar_url}
                      name={c.author.login}
                      size={20}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* contributors */}
        <Section
          title="Contributors"
          count={contributors.length}
          href={`${repoData.html_url}/graphs/contributors`}
        >
          {contributors.length === 0 ? (
            <Empty>No contributors found</Empty>
          ) : (
            <div className="flex flex-wrap gap-2">
              {contributors.map((c) => (
                <a
                  key={c.login}
                  href={c.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 border border-border px-3 py-1.5 font-mono text-xs transition-colors hover:bg-surface-hover"
                >
                  <Avatar src={c.avatar_url} name={c.login} size={16} />
                  {c.login}
                  <span className="text-text-tertiary">{c.contributions}</span>
                </a>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* readme - full width */}
      <div className="mt-6">
        <div className="flex min-w-0 flex-col border border-border bg-surface p-4">
          <div className="mb-3 flex shrink-0 items-center justify-between">
            <h2 className="font-medium text-sm">README</h2>
          </div>
          <div className="min-h-0 flex-1 overflow-auto pr-2">
            {readme ? (
              <pre className="whitespace-pre-wrap font-mono text-text-secondary text-xs">
                {readme}
              </pre>
            ) : (
              <Empty>No README found</Empty>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// -- helpers --

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="py-4 text-center text-sm text-text-tertiary">{children}</p>
  );
}

function Avatar({
  src,
  name,
  size,
}: {
  src: string;
  name: string;
  size: number;
}) {
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
    <Image
      src={src}
      alt=""
      title={name}
      width={size}
      height={size}
      unoptimized
      className="shrink-0 rounded-full"
      onError={(e: SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.onerror = null;
        setFailed(true);
      }}
    />
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function RepoDetailSkeleton() {
  return (
    <div className="px-6 py-8">
      <div className="mb-6 h-4 w-48 animate-pulse rounded bg-surface-hover" />
      <div className="mb-2 h-7 w-64 animate-pulse rounded bg-surface-hover" />
      <div className="mb-8 h-4 w-96 animate-pulse rounded bg-surface-hover" />
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={`repo-section-skeleton-${i + 1}`}
            className="flex h-[350px] flex-col border border-border bg-surface p-4"
          >
            <div className="mb-3 h-4 w-32 animate-pulse rounded bg-surface-hover" />
            <div className="flex flex-1 flex-col gap-3">
              {Array.from({ length: 5 }).map((__, j) => (
                <div
                  key={`repo-line-skeleton-${i + 1}-${j + 1}`}
                  className="h-4 w-full animate-pulse rounded bg-surface-hover"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
