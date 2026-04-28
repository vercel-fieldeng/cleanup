"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  FilterAccordion,
  type FilterKey,
  type GroupByKey,
} from "@/components/filter-accordion";
import { ProjectsTableSkeleton } from "@/components/projects-table-skeleton";
import { useToken } from "@/components/token-provider";
import type {
  ProjectWithMeta,
  VercelIntegration,
  VercelProject,
} from "@/lib/types";
import {
  deleteProject,
  fetchAllProjects,
  fetchEnvVars,
  fetchIntegrations,
} from "@/lib/vercel-api";

function teamAvatarUrl(teamId: string, size = 64) {
  return `https://vercel.com/api/www/avatar?teamId=${encodeURIComponent(teamId)}&s=${size}`;
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
          Delete {count} project{count !== 1 ? "s" : ""}?
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          This permanently deletes the selected project{count !== 1 ? "s" : ""},
          all deployments, and environment variables. This cannot be undone.
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

type SortKey =
  | "name"
  | "framework"
  | "created"
  | "deployments"
  | "envVars"
  | "integrations";
type SortDir = "asc" | "desc";

type ProjectGroup = {
  key: string;
  label: string;
  avatarUrl?: string;
  projects: ProjectWithMeta[];
};

function computeIntegrationCounts(
  projects: VercelProject[],
  integrations: VercelIntegration[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of projects) counts.set(p.id, 0);

  for (const integration of integrations) {
    if (integration.projectSelection === "all") {
      for (const p of projects) {
        counts.set(p.id, (counts.get(p.id) ?? 0) + 1);
      }
    } else if (integration.projects) {
      for (const pid of integration.projects) {
        if (counts.has(pid)) {
          counts.set(pid, (counts.get(pid) ?? 0) + 1);
        }
      }
    }
  }

  return counts;
}

export function ProjectsView() {
  const { token, team } = useToken();
  const searchParams = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const [projects, setProjects] = useState<ProjectWithMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [envLoading, setEnvLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    const s = searchParams.get("sort");
    if (
      s === "name" ||
      s === "framework" ||
      s === "created" ||
      s === "deployments" ||
      s === "envVars" ||
      s === "integrations"
    )
      return s;
    return "created";
  });
  const [sortDir, setSortDir] = useState<SortDir>(() => {
    const d = searchParams.get("dir");
    if (d === "asc" || d === "desc") return d;
    return "asc";
  });
  const [filters, setFilters] = useState<Record<FilterKey, boolean>>(() => {
    const f = searchParams.get("f");
    if (!f)
      return {
        zeroDeploys: false,
        zeroEnvVars: false,
        zeroIntegrations: false,
        v0Prefix: false,
      };
    const active = new Set(f.split(","));
    return {
      zeroDeploys: active.has("zeroDeploys"),
      zeroEnvVars: active.has("zeroEnvVars"),
      zeroIntegrations: active.has("zeroIntegrations"),
      v0Prefix: active.has("v0Prefix"),
    };
  });
  const [filterOpen, setFilterOpen] = useState(() =>
    Boolean(searchParams.get("f")),
  );
  const [groupBy, setGroupBy] = useState<GroupByKey | null>(() => {
    const g = searchParams.get("g");
    if (g === "year" || g === "creator" || g === "recentUser") return g;
    return null;
  });

  const router = useRouter();
  const pathname = usePathname();
  const searchRef = useRef(search);
  searchRef.current = search;
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const params = new URLSearchParams();
    if (searchRef.current) params.set("q", searchRef.current);

    const activeFilters = Object.entries(filters)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (activeFilters.length > 0) params.set("f", activeFilters.join(","));
    if (groupBy) params.set("g", groupBy);
    if (sortKey !== "created") params.set("sort", sortKey);
    if (sortDir !== "asc") params.set("dir", sortDir);

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [filters, groupBy, sortKey, sortDir, pathname, router]);

  const opts = useMemo(
    () => (token ? { token, teamId: team?.id } : null),
    [token, team],
  );

  const loadEnvCounts = useCallback(
    async (
      items: ProjectWithMeta[],
      fetchOpts: { token: string; teamId?: string },
    ): Promise<ProjectWithMeta[]> => {
      const cacheKey = `env-counts-${fetchOpts.teamId ?? "personal"}`;
      let cached: Record<string, number> = {};
      try {
        const raw = sessionStorage.getItem(cacheKey);
        if (raw) cached = JSON.parse(raw) as Record<string, number>;
      } catch {
        /* ignore */
      }

      const result = [...items];

      // apply cached counts first
      for (let i = 0; i < result.length; i++) {
        if (result[i].id in cached) {
          result[i] = { ...result[i], envVarCount: cached[result[i].id] };
        }
      }

      // only fetch uncached projects
      const uncached = result.filter((p) => p.envVarCount === null);
      if (uncached.length === 0) return result;

      const batchSize = 10;
      for (let i = 0; i < uncached.length; i += batchSize) {
        const batch = uncached.slice(i, i + batchSize);
        const counts = await Promise.all(
          batch.map(async (p) => {
            try {
              const data = await fetchEnvVars(p.id, fetchOpts);
              return { id: p.id, count: data.envs?.length ?? 0 };
            } catch {
              return { id: p.id, count: 0 };
            }
          }),
        );

        for (const { id, count } of counts) {
          cached[id] = count;
          const idx = result.findIndex((p) => p.id === id);
          if (idx !== -1) {
            result[idx] = { ...result[idx], envVarCount: count };
          }
        }
      }

      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(cached));
      } catch {
        /* storage full, ignore */
      }

      return result;
    },
    [],
  );

  // fetch projects + integrations when team changes
  useEffect(() => {
    if (!opts) return;
    setLoading(true);
    setError(null);
    setSelected(new Set());
    setProjects([]);

    Promise.all([
      fetchAllProjects(opts),
      fetchIntegrations(opts).catch(() => [] as Array<Record<string, unknown>>),
    ])
      .then(([raw, rawIntegrations]) => {
        const integrations = rawIntegrations as unknown as VercelIntegration[];
        const typedProjects = raw as unknown as VercelProject[];
        const intCounts = computeIntegrationCounts(typedProjects, integrations);

        const mapped: ProjectWithMeta[] = typedProjects.map((p) => ({
          ...p,
          envVarCount: null,
          integrationCount: intCounts.get(p.id) ?? 0,
        }));
        setProjects(mapped);
        setLoading(false);

        // fetch env var counts in background
        setEnvLoading(true);
        loadEnvCounts(mapped, opts).then((updated) => {
          setProjects(updated);
          setEnvLoading(false);
        });
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to load projects",
        );
        setLoading(false);
      });
  }, [opts, loadEnvCounts]);

  // filter counts (per-chip)
  const filterCounts = useMemo(
    (): Record<FilterKey, number> => ({
      zeroDeploys: projects.filter((p) => !p.latestDeployments?.length).length,
      zeroEnvVars: projects.filter((p) => p.envVarCount === 0).length,
      zeroIntegrations: projects.filter((p) => p.integrationCount === 0).length,
      v0Prefix: projects.filter((p) => p.name.startsWith("v0-")).length,
    }),
    [projects],
  );

  // apply filters (AND)
  const applyFilters = useCallback(
    (list: ProjectWithMeta[]) => {
      let result = list;
      if (filters.zeroDeploys)
        result = result.filter((p) => !p.latestDeployments?.length);
      if (filters.zeroEnvVars)
        result = result.filter((p) => p.envVarCount === 0);
      if (filters.zeroIntegrations)
        result = result.filter((p) => p.integrationCount === 0);
      if (filters.v0Prefix)
        result = result.filter((p) => p.name.startsWith("v0-"));
      return result;
    },
    [filters],
  );

  const matchCount = useMemo(
    () => applyFilters(projects).length,
    [applyFilters, projects],
  );

  // sorting + filtering
  const filtered = useMemo(() => {
    let list = projects;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.framework?.toLowerCase().includes(q) ||
          p.link?.repo?.toLowerCase().includes(q),
      );
    }

    list = applyFilters(list);

    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "framework":
          cmp = (a.framework ?? "").localeCompare(b.framework ?? "");
          break;
        case "created":
          cmp = a.createdAt - b.createdAt;
          break;
        case "deployments":
          cmp =
            (a.latestDeployments?.length ?? 0) -
            (b.latestDeployments?.length ?? 0);
          break;
        case "envVars":
          cmp = (a.envVarCount ?? 0) - (b.envVarCount ?? 0);
          break;
        case "integrations":
          cmp = (a.integrationCount ?? 0) - (b.integrationCount ?? 0);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [projects, search, sortKey, sortDir, applyFilters]);

  const groups = useMemo((): ProjectGroup[] => {
    if (!groupBy) return [];

    const map = new Map<string, ProjectGroup>();

    for (const p of filtered) {
      let key: string;
      let label: string;
      let avatarUrl: string | undefined;

      switch (groupBy) {
        case "year": {
          const year = new Date(p.createdAt).getFullYear().toString();
          key = year;
          label = year;
          break;
        }
        case "creator": {
          const deployments = p.latestDeployments ?? [];
          const oldest =
            deployments.length > 0
              ? deployments.reduce((a, b) =>
                  a.createdAt < b.createdAt ? a : b,
                )
              : null;
          const username = oldest?.creator.username ?? "Unknown";
          key = username;
          label = username;
          avatarUrl =
            username !== "Unknown"
              ? `https://vercel.com/api/www/avatar?u=${username}&s=64`
              : undefined;
          break;
        }
        case "recentUser": {
          const username =
            p.latestDeployments?.[0]?.creator.username ?? "Unknown";
          key = username;
          label = username;
          avatarUrl =
            username !== "Unknown"
              ? `https://vercel.com/api/www/avatar?u=${username}&s=64`
              : undefined;
          break;
        }
      }

      const existing = map.get(key);
      if (existing) {
        existing.projects.push(p);
      } else {
        map.set(key, { key, label, avatarUrl, projects: [p] });
      }
    }

    const result = Array.from(map.values());

    if (groupBy === "year") {
      result.sort((a, b) => Number(b.key) - Number(a.key));
    } else {
      result.sort((a, b) => a.label.localeCompare(b.label));
    }

    return result;
  }, [filtered, groupBy]);

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

  const toggleSelect = useCallback((id: string) => {
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
      setSelected(new Set(filtered.map((p) => p.id)));
    }
  }, [filtered, selected.size]);

  const toggleFilter = useCallback((key: FilterKey) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  async function handleDelete() {
    if (!opts) return;
    setDeleting(true);
    const ids = [...selected];
    const results = await Promise.allSettled(
      ids.map((id) => deleteProject(id, opts)),
    );

    const deleted: string[] = [];
    const failed: { id: string; reason: string }[] = [];
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
      setProjects((prev) => prev.filter((p) => !deletedSet.has(p.id)));
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of deleted) next.delete(id);
        return next;
      });
    }

    if (failed.length > 0) {
      const names = failed.map((f) => {
        const p = projects.find((proj) => proj.id === f.id);
        return p ? p.name : f.id;
      });
      setError(
        `Deleted ${deleted.length}, ${failed.length} failed: ${names.join(", ")}`,
      );
    }

    setShowDelete(false);
    setDeleting(false);
  }

  const projectRow = (p: ProjectWithMeta) => (
    <tr
      key={p.id}
      className="group border-border border-b transition-colors hover:bg-surface-hover"
    >
      <td className="px-5 py-2.5">
        <input
          type="checkbox"
          checked={selected.has(p.id)}
          onChange={() => toggleSelect(p.id)}
          className="accent-white"
        />
      </td>
      <td className="px-4 py-2.5">
        <Link
          href={`/vercel/projects/${p.id}`}
          className="font-medium text-sm hover:underline"
        >
          {p.name}
        </Link>
      </td>
      <td className="px-4 py-2.5 font-mono text-text-secondary text-xs">
        {p.framework ?? "—"}
      </td>
      <td className="px-4 py-2.5 text-text-secondary text-xs">
        {p.link ? (
          <a
            href={`https://github.com/${p.link.repo}`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-text hover:underline"
          >
            {p.link.repo}
          </a>
        ) : (
          "—"
        )}
      </td>
      <td className="px-4 py-2.5 font-mono text-text-secondary text-xs">
        {formatDate(p.createdAt)}
      </td>
      <td className="px-4 py-2.5 font-mono text-text-secondary text-xs">
        {p.latestDeployments?.length ?? 0}
      </td>
      <td className="px-4 py-2.5 font-mono text-text-secondary text-xs">
        {p.envVarCount === null ? (
          <span className="text-text-tertiary">…</span>
        ) : (
          p.envVarCount
        )}
      </td>
      <td className="px-4 py-2.5 font-mono text-text-secondary text-xs">
        {p.integrationCount === null ? (
          <span className="text-text-tertiary">…</span>
        ) : (
          p.integrationCount
        )}
      </td>
    </tr>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* filter accordion */}
      <FilterAccordion
        open={filterOpen}
        onToggle={() => setFilterOpen((v) => !v)}
        filters={filters}
        onFilterToggle={toggleFilter}
        counts={filterCounts}
        matchCount={matchCount}
        totalCount={filtered.length}
        envLoading={envLoading}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
      />

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
          <ProjectsTableSkeleton />
        ) : filtered.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <span className="text-sm text-text-secondary">
              {search ? "No projects match your search" : "No projects found"}
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
                  label="Project"
                  sortKey="name"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                  className="max-w-[180px]"
                />
                <SortHeader
                  label="Framework"
                  sortKey="framework"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <th className="px-4 py-2.5">Repository</th>
                <SortHeader
                  label="Created"
                  sortKey="created"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                  className="min-w-[130px]"
                />
                <SortHeader
                  label="Deploys"
                  sortKey="deployments"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <SortHeader
                  label="Env Vars"
                  sortKey="envVars"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                  className="min-w-[100px]"
                />
                <SortHeader
                  label="Integrations"
                  sortKey="integrations"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                />
              </tr>
            </thead>
            <tbody>
              {groupBy
                ? groups.map((group) => (
                    <Fragment key={group.key}>
                      <tr className="border-border border-b bg-surface">
                        <td colSpan={8} className="px-5 py-2">
                          <div className="flex items-center gap-2">
                            {group.avatarUrl && (
                              <img
                                src={group.avatarUrl}
                                alt=""
                                width={16}
                                height={16}
                                className="rounded-full"
                              />
                            )}
                            <span className="font-medium text-sm">
                              {group.label}
                            </span>
                            <span className="font-mono text-xs text-text-tertiary">
                              {group.projects.length}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {group.projects.map(projectRow)}
                    </Fragment>
                  ))
                : filtered.map(projectRow)}
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
              onClick={() => setShowDelete(true)}
              className="h-8 bg-danger px-4 font-medium text-sm text-white transition-colors hover:bg-danger-hover"
            >
              Delete Selected
            </button>
          </div>
        </div>
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

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
