"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Check as CheckIcon,
  ChevronRight as ChevronIcon,
  Settings as SettingsIcon,
} from "lucide-react";
import { useToken } from "@/components/token-provider";
import {
  archiveRepo,
  deleteRepo,
  fetchOrgRepos,
  fetchUserRepos,
} from "@/lib/github-api";
import type { GitHubRepo } from "@/lib/github-types";

// -- org switcher inline --

function OrgAvatar({
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

function OrgSwitcherInline() {
  const { githubOrg, setGithubOrg, githubOrgs, githubUser } = useToken();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const isPersonal = !githubOrg;
  const currentLabel = isPersonal
    ? (githubUser?.login ?? "Personal")
    : githubOrg.login;
  const currentAvatar = isPersonal
    ? (githubUser?.avatar_url ?? null)
    : githubOrg.avatar_url;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 items-center gap-2 border border-border bg-surface px-3 text-sm transition-colors hover:bg-surface-hover"
      >
        {currentAvatar && (
          <OrgAvatar src={currentAvatar} name={currentLabel} size={20} />
        )}
        <span className="max-w-[180px] truncate">{currentLabel}</span>
        <ChevronIcon
          size={12}
          className={`text-text-tertiary transition-transform ${open ? "rotate-90" : "-rotate-90"}`}
        />
      </button>

      {open && (
        <div className="absolute top-full right-0 z-50 mt-1 min-w-[220px] border border-border bg-surface shadow-lg">
          <div className="py-1">
            {/* personal account */}
            {githubUser && (
              <button
                type="button"
                onClick={() => {
                  setGithubOrg(null);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover ${
                  isPersonal ? "text-text" : "text-text-secondary"
                }`}
              >
                <OrgAvatar
                  src={githubUser.avatar_url}
                  name={githubUser.login}
                  size={20}
                />
                <span className="truncate">{githubUser.login}</span>
                {isPersonal && <CheckIcon size={14} className="ml-auto shrink-0" />}
              </button>
            )}
            {/* orgs */}
            {githubOrgs.map((org) => (
              <button
                key={org.id}
                type="button"
                onClick={() => {
                  setGithubOrg(org);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover ${
                  githubOrg?.id === org.id ? "text-text" : "text-text-secondary"
                }`}
              >
                <OrgAvatar src={org.avatar_url} name={org.login} size={20} />
                <span className="truncate">{org.login}</span>
                {githubOrg?.id === org.id && (
                  <CheckIcon size={14} className="ml-auto shrink-0" />
                )}
              </button>
            ))}
          </div>
          {/* manage link */}
          <div className="border-border border-t">
            <Link
              href="/github"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover"
            >
              <SettingsIcon size={14} />
              Manage
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// -- archive confirmation modal --

function ArchiveModal({
  count,
  onConfirm,
  onCancel,
  archiving,
}: {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
  archiving: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm border border-border bg-surface p-6">
        <h2 className="font-semibold text-base">
          Archive {count} repositor{count !== 1 ? "ies" : "y"}?
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          This will make them read-only.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={archiving}
            className="h-8 border border-border px-4 text-sm transition-colors hover:bg-surface-hover disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={archiving}
            className="h-8 bg-warning px-4 font-medium text-black text-sm transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {archiving ? "Archiving..." : "Archive"}
          </button>
        </div>
      </div>
    </div>
  );
}

// -- delete confirmation modal --

function DeleteModal({
  count,
  onConfirm,
  onCancel,
  deleting,
}: {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm border border-border bg-surface p-6">
        <h2 className="font-semibold text-base">
          Delete {count} repositor{count !== 1 ? "ies" : "y"}?
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          This permanently deletes the selected repositor
          {count !== 1 ? "ies" : "y"}. This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="h-8 border border-border px-4 text-sm transition-colors hover:bg-surface-hover disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="h-8 bg-danger px-4 font-medium text-sm text-white transition-colors hover:bg-danger-hover disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// -- main view --

type SortKey = "name" | "pushed_at" | "archived";
type SortDir = "asc" | "desc";

export function ReposView() {
  const { githubToken, githubOrg } = useToken();
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showDelete, setShowDelete] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("pushed_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // fetch repos when org / token changes
  useEffect(() => {
    if (!githubToken) return;
    setLoading(true);
    setError(null);
    setSelected(new Set());
    setRepos([]);

    const opts = { token: githubToken };
    const promise = githubOrg
      ? fetchOrgRepos(githubOrg.login, opts)
      : fetchUserRepos(opts);

    promise
      .then((raw) => {
        setRepos(raw as unknown as GitHubRepo[]);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load repos");
      })
      .finally(() => setLoading(false));
  }, [githubToken, githubOrg]);

  // sorting + filtering
  const filtered = useMemo(() => {
    let list = repos;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q));
    }

    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "pushed_at":
          cmp =
            new Date(a.pushed_at ?? 0).getTime() -
            new Date(b.pushed_at ?? 0).getTime();
          break;
        case "archived":
          cmp = Number(a.archived) - Number(b.archived);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [repos, search, sortKey, sortDir]);

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey],
  );

  const toggleSelect = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((r) => r.id)));
    }
  }, [filtered, selected.size]);

  async function handleArchive() {
    if (!githubToken) return;
    setArchiving(true);
    const ids = [...selected];
    const opts = { token: githubToken };
    const results = await Promise.allSettled(
      ids.map((id) => {
        const repo = repos.find((r) => r.id === id);
        if (!repo) return Promise.reject(new Error("Repo not found"));
        return archiveRepo(repo.owner.login, repo.name, opts);
      }),
    );

    const archived: number[] = [];
    const failed: { id: number; reason: string }[] = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === "fulfilled") {
        archived.push(ids[i]);
      } else {
        const err = (results[i] as PromiseRejectedResult).reason;
        failed.push({
          id: ids[i],
          reason: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    if (archived.length > 0) {
      const archivedSet = new Set(archived);
      setRepos((prev) =>
        prev.map((r) => (archivedSet.has(r.id) ? { ...r, archived: true } : r)),
      );
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of archived) next.delete(id);
        return next;
      });
    }

    if (failed.length > 0) {
      const names = failed.map((f) => {
        const r = repos.find((repo) => repo.id === f.id);
        return r ? r.name : String(f.id);
      });
      setError(
        `Archived ${archived.length}, ${failed.length} failed: ${names.join(", ")}`,
      );
    }

    setShowArchive(false);
    setArchiving(false);
  }

  async function handleDelete() {
    if (!githubToken) return;
    setDeleting(true);
    const ids = [...selected];
    const opts = { token: githubToken };
    const results = await Promise.allSettled(
      ids.map((id) => {
        const repo = repos.find((r) => r.id === id);
        if (!repo) return Promise.reject(new Error("Repo not found"));
        return deleteRepo(repo.owner.login, repo.name, opts);
      }),
    );

    const deleted: number[] = [];
    const failed: { id: number; reason: string }[] = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === "fulfilled") {
        deleted.push(ids[i]);
      } else {
        const err = (results[i] as PromiseRejectedResult).reason;
        failed.push({
          id: ids[i],
          reason: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    if (deleted.length > 0) {
      const deletedSet = new Set(deleted);
      setRepos((prev) => prev.filter((r) => !deletedSet.has(r.id)));
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of deleted) next.delete(id);
        return next;
      });
    }

    if (failed.length > 0) {
      const names = failed.map((f) => {
        const r = repos.find((repo) => repo.id === f.id);
        return r ? r.name : String(f.id);
      });
      setError(
        `Deleted ${deleted.length}, ${failed.length} failed: ${names.join(", ")}`,
      );
    }

    setShowDelete(false);
    setDeleting(false);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-border border-b px-5 py-3">
        <input
          type="text"
          placeholder="Search repositories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-64 border border-border bg-surface px-3 text-sm outline-none transition-colors placeholder:text-text-tertiary focus:border-text-secondary"
        />
        <div className="ml-auto">
          <OrgSwitcherInline />
        </div>
      </div>

      {/* error */}
      {error && (
        <div className="border-danger/30 border-b bg-danger/10 px-5 py-2 text-danger text-sm">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-3 underline"
          >
            dismiss
          </button>
        </div>
      )}

      {/* table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <ReposTableSkeleton />
        ) : filtered.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <span className="text-sm text-text-secondary">
              {search
                ? "No repositories match your search"
                : "No repositories found"}
            </span>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-bg">
              <tr className="border-border border-b text-left text-text-secondary text-xs">
                <th className="w-10 px-5 py-2.5">
                  <input
                    type="checkbox"
                    checked={
                      filtered.length > 0 && selected.size === filtered.length
                    }
                    onChange={toggleAll}
                    className="accent-white"
                  />
                </th>
                <SortHeader
                  label="Repository"
                  sortKey="name"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                  className="max-w-[180px]"
                />
                <SortHeader
                  label="Last commit"
                  sortKey="pushed_at"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                  className="min-w-[130px]"
                />
                <SortHeader
                  label="Archived"
                  sortKey="archived"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="group border-border border-b transition-colors hover:bg-surface-hover"
                >
                  <td className="px-5 py-2.5">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleSelect(r.id)}
                      className="accent-white"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/github/repos/${r.owner.login}/${r.name}`}
                      className="font-medium text-sm hover:underline"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-text-secondary text-xs">
                    {r.pushed_at ? formatDate(r.pushed_at) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {r.archived ? (
                      <span className="border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-warning">
                        Archived
                      </span>
                    ) : (
                      <span className="text-text-secondary">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* bulk action bar */}
      {selected.size > 0 && (
        <div className="flex shrink-0 items-center justify-between border-border border-t bg-surface px-5 py-3">
          <span className="font-mono text-sm">{selected.size} selected</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="h-8 border border-border px-4 text-sm transition-colors hover:bg-surface-hover"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setShowArchive(true)}
              className="h-8 border border-warning px-4 font-medium text-sm text-warning transition-colors hover:bg-warning/10"
            >
              Archive Selected
            </button>
            <button
              type="button"
              onClick={() => setShowDelete(true)}
              className="h-8 bg-danger px-4 font-medium text-sm text-white transition-colors hover:bg-danger-hover"
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* archive modal */}
      {showArchive && (
        <ArchiveModal
          count={selected.size}
          onConfirm={handleArchive}
          onCancel={() => setShowArchive(false)}
          archiving={archiving}
        />
      )}

      {/* delete modal */}
      {showDelete && (
        <DeleteModal
          count={selected.size}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          deleting={deleting}
        />
      )}
    </div>
  );
}

// -- helpers --

function SortHeader({
  label,
  sortKey,
  currentKey,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = sortKey === currentKey;
  return (
    <th className={`px-4 py-2.5 ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`flex items-center gap-1 transition-colors hover:text-text ${active ? "text-text" : ""}`}
      >
        {label}
        {active && (
          <span className="text-[10px]">{dir === "asc" ? "▲" : "▼"}</span>
        )}
      </button>
    </th>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ReposTableSkeleton() {
  return (
    <div className="px-5 py-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={`repo-skeleton-row-${i + 1}`}
          className="flex items-center gap-4 border-border border-b py-3"
        >
          <div className="h-4 w-4 animate-pulse rounded bg-surface-hover" />
          <div className="h-4 w-40 animate-pulse rounded bg-surface-hover" />
          <div className="h-4 w-20 animate-pulse rounded bg-surface-hover" />
          <div className="h-4 w-24 animate-pulse rounded bg-surface-hover" />
          <div className="h-4 w-16 animate-pulse rounded bg-surface-hover" />
          <div className="h-4 w-14 animate-pulse rounded bg-surface-hover" />
        </div>
      ))}
    </div>
  );
}
