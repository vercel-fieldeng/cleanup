"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { CheckIcon, ExternalLinkIcon } from "@/components/icons";
import { useToken } from "@/components/token-provider";
import { PROVIDER_LOGOS } from "@/lib/provider-logos";
import type { VercelIntegration, VercelStore } from "@/lib/types";
import { deleteStore, fetchIntegrations, fetchStores } from "@/lib/vercel-api";

// maps store types to the integration slugs they belong to
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

type StoreGroup = {
  key: string;
  label: string;
  slug: string;
  iconUrl?: string;
  manageUrl: string | null;
  stores: VercelStore[];
};

export function IntegrationsView() {
  const { token, team } = useToken();
  const searchParams = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const [integrations, setIntegrations] = useState<VercelIntegration[]>([]);
  const [stores, setStores] = useState<VercelStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const lastClickedRef = useRef<string | null>(null);

  const opts = useMemo(
    () => (token ? { token, teamId: team?.id } : null),
    [token, team],
  );

  const ownerSlug = team?.slug;

  useEffect(() => {
    if (!opts) return;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchIntegrations(opts),
      fetchStores(opts).catch(() => ({ stores: [] })),
    ])
      .then(([rawIntgs, rawStores]) => {
        const intgs = (Array.isArray(rawIntgs)
          ? rawIntgs
          : []) as unknown as VercelIntegration[];
        const storesList = (rawStores.stores ?? []) as unknown as VercelStore[];

        setIntegrations(intgs);
        setStores(storesList);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => setLoading(false));
  }, [opts]);

  // build unified groups: integration-backed + first-party
  const groups = useMemo(() => {
    const result: StoreGroup[] = [];

    // group integrations by slug to get metadata
    const intgBySlug = new Map<string, VercelIntegration[]>();
    for (const intg of integrations) {
      const list = intgBySlug.get(intg.slug) ?? [];
      list.push(intg);
      intgBySlug.set(intg.slug, list);
    }

    // bucket stores: marketplace → integration slug, first-party → type
    const slugSet = new Set(intgBySlug.keys());
    const marketplaceStores = new Map<string, VercelStore[]>();
    const firstPartyStores = new Map<string, VercelStore[]>();

    for (const store of stores) {
      if (FIRST_PARTY_TYPES.has(store.type)) {
        const list = firstPartyStores.get(store.type) ?? [];
        list.push(store);
        firstPartyStores.set(store.type, list);
        continue;
      }

      // match via product integration slug or product slug
      const integrationSlug = store.product?.integration?.slug;
      const productSlug = store.product?.slug;
      const matchedSlug =
        (integrationSlug && slugSet.has(integrationSlug)
          ? integrationSlug
          : null) ??
        (productSlug && slugSet.has(productSlug) ? productSlug : null);
      if (matchedSlug) {
        const list = marketplaceStores.get(matchedSlug) ?? [];
        list.push(store);
        marketplaceStores.set(matchedSlug, list);
        continue;
      }

      // fallback: type-based mapping
      const candidates = STORE_TYPE_TO_SLUGS[store.type] ?? [];
      const matched = candidates.find((s) => slugSet.has(s));
      if (matched) {
        const list = marketplaceStores.get(matched) ?? [];
        list.push(store);
        marketplaceStores.set(matched, list);
      }
    }

    // integration groups
    for (const [slug, intgs] of intgBySlug) {
      const slugStores = marketplaceStores.get(slug) ?? [];
      const meta = intgs.find((i) => i.integration);
      const configId = intgs[0]?.id;
      result.push({
        key: `intg-${slug}`,
        label: meta?.integration?.name ?? slug,
        slug,
        iconUrl: meta?.integration?.icon,
        manageUrl:
          ownerSlug && configId
            ? `https://vercel.com/${ownerSlug}/~/integrations/${slug}/${configId}`
            : null,
        stores: slugStores,
      });
    }

    // first-party groups
    for (const [type, typeStores] of firstPartyStores) {
      result.push({
        key: `fp-${type}`,
        label: FIRST_PARTY_LABELS[type] ?? type,
        slug: type,
        manageUrl: ownerSlug
          ? `https://vercel.com/${ownerSlug}/~/stores?type=${type}`
          : null,
        stores: typeStores,
      });
    }

    return result.sort((a, b) => a.label.localeCompare(b.label));
  }, [integrations, stores, ownerSlug]);

  const filteredGroups = useMemo(() => {
    if (!search) return groups;
    const q = search.toLowerCase();
    return groups
      .map((g) => {
        const labelMatch = g.label.toLowerCase().includes(q);
        if (labelMatch) return g;
        const matchedStores = g.stores.filter((s) =>
          s.name.toLowerCase().includes(q),
        );
        if (matchedStores.length > 0) return { ...g, stores: matchedStores };
        return null;
      })
      .filter((g): g is StoreGroup => g !== null);
  }, [groups, search]);

  function toggleCollapse(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // visible (non-collapsed) store ids in render order for range selection
  const visibleStoreIds = useMemo(
    () =>
      filteredGroups.flatMap((g) =>
        collapsed.has(g.key) ? [] : g.stores.map((s) => s.id),
      ),
    [filteredGroups, collapsed],
  );

  function handleStoreClick(storeId: string, e: React.MouseEvent) {
    const isRangeSelect = e.shiftKey || e.altKey;

    if (isRangeSelect) {
      e.preventDefault();
      window.getSelection()?.removeAllRanges();
    }

    setSelected((prev) => {
      const next = new Set(prev);
      const last = lastClickedRef.current;

      if (isRangeSelect && last && last !== storeId) {
        const lastIdx = visibleStoreIds.indexOf(last);
        const currIdx = visibleStoreIds.indexOf(storeId);
        if (lastIdx !== -1 && currIdx !== -1) {
          const [start, end] =
            lastIdx < currIdx ? [lastIdx, currIdx] : [currIdx, lastIdx];
          for (let i = start; i <= end; i++) {
            next.add(visibleStoreIds[i]);
          }
          return next;
        }
      }

      if (next.has(storeId)) next.delete(storeId);
      else next.add(storeId);
      return next;
    });
    lastClickedRef.current = storeId;
  }

  async function handleDeleteSelected(storeIds: string[]) {
    if (!opts) return;
    const count = storeIds.length;
    if (
      !window.confirm(
        `Delete ${count} store${count !== 1 ? "s" : ""}? This cannot be undone.`,
      )
    )
      return;
    setDeleting((prev) => {
      const next = new Set(prev);
      for (const id of storeIds) next.add(id);
      return next;
    });

    const results = await Promise.allSettled(
      storeIds.map((id) => {
        const store = stores.find((item) => item.id === id);
        if (!store) {
          throw new Error("Store not found");
        }
        return deleteStore(store, opts);
      }),
    );

    const deleted: string[] = [];
    const failed: string[] = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === "fulfilled") deleted.push(storeIds[i]);
      else failed.push(storeIds[i]);
    }

    if (deleted.length > 0) {
      const deletedSet = new Set(deleted);
      setStores((prev) => prev.filter((s) => !deletedSet.has(s.id)));
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of deleted) next.delete(id);
        return next;
      });
    }

    setDeleting((prev) => {
      const next = new Set(prev);
      for (const id of storeIds) next.delete(id);
      return next;
    });

    if (failed.length > 0) {
      alert(
        `Failed to delete ${failed.length} store${failed.length !== 1 ? "s" : ""}`,
      );
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 px-6 py-8">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="font-semibold text-lg">Integrations</h1>
          <div className="h-3.5 w-28 animate-pulse rounded bg-surface-hover" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`integration-skeleton-${i + 1}`}
            className="border border-border bg-surface"
          >
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 animate-pulse rounded bg-surface-hover" />
                <div className="h-4 w-32 animate-pulse rounded bg-surface-hover" />
                <div className="h-3 w-14 animate-pulse rounded bg-surface-hover" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-3 w-12 animate-pulse rounded bg-surface-hover" />
                <div className="h-2.5 w-2.5 animate-pulse rounded bg-surface-hover" />
              </div>
            </div>
            <div className="divide-y divide-border border-border border-t">
              {Array.from({ length: 2 }).map((_, j) => (
                <div
                  key={`integration-skeleton-row-${i + 1}-${j + 1}`}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <div className="h-3.5 w-44 animate-pulse rounded bg-surface-hover" />
                  <div className="h-4 w-24 animate-pulse rounded bg-surface-hover" />
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

  if (filteredGroups.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="text-sm text-text-secondary">
          {search
            ? "No integrations match your search"
            : "No integrations or stores found"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-auto px-6 py-8">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="font-semibold text-lg">Integrations</h1>
        <span className="font-mono text-text-tertiary text-xs">
          {filteredGroups.length} group{filteredGroups.length !== 1 ? "s" : ""}
          {" · "}
          {stores.length} store{stores.length !== 1 ? "s" : ""}
        </span>
      </div>

      {filteredGroups.map((group) => {
        const isCollapsed = collapsed.has(group.key);
        const selectedInGroup = group.stores.filter((s) => selected.has(s.id));
        const someSelected = selectedInGroup.length > 0;

        return (
          <div key={group.key} className="border border-border bg-surface">
            <button
              type="button"
              onClick={() => toggleCollapse(group.key)}
              className="flex min-h-12 w-full items-center justify-between px-4 text-left transition-colors hover:bg-surface-hover"
            >
              <div className="flex items-center gap-3">
                <ProviderIcon
                  slug={group.slug}
                  iconUrl={group.iconUrl}
                  size={24}
                />
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{group.label}</span>
                  {group.stores.length > 0 && (
                    <span className="font-mono text-[10px] text-text-tertiary">
                      {group.stores.length} store
                      {group.stores.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {someSelected && (
                  <span className="border border-danger px-3 py-1 text-danger text-xs">
                    {selectedInGroup.length} selected
                  </span>
                )}
                {group.manageUrl && (
                  <span className="inline-flex items-center gap-1 text-text-secondary text-xs">
                    Manage in Vercel
                  </span>
                )}
                <ChevronIcon expanded={!isCollapsed} />
              </div>
            </button>

            {!isCollapsed && group.stores.length > 0 && (
              <>
                {someSelected && (
                  <div className="border-border border-t bg-surface px-4 py-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteSelected(
                          selectedInGroup.map((store) => store.id),
                        )
                      }
                      className="border border-danger px-3 py-1 text-danger text-xs transition-colors hover:bg-danger/10"
                    >
                      Delete {selectedInGroup.length} selected store
                      {selectedInGroup.length !== 1 ? "s" : ""}
                    </button>
                  </div>
                )}
                <div className="divide-y divide-border border-border border-t">
                  {group.stores.map((store) => (
                    <StoreRow
                      key={store.id}
                      store={store}
                      isSelected={selected.has(store.id)}
                      isDeleting={deleting.has(store.id)}
                      onClick={(e) => handleStoreClick(store.id, e)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StoreRow({
  store,
  isSelected,
  isDeleting,
  onClick,
}: {
  store: VercelStore;
  isSelected: boolean;
  isDeleting: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      className={`group flex w-full cursor-pointer select-none items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-hover ${isDeleting ? "opacity-50" : ""} ${isSelected ? "bg-surface-hover/50" : ""}`}
      onMouseDown={(e) => {
        if (e.shiftKey || e.altKey) e.preventDefault();
      }}
      onClick={onClick}
    >
      <span
        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border transition-colors ${isSelected ? "border-text bg-text" : "border-text-tertiary bg-transparent"}`}
      >
        {isSelected && <CheckIcon className="text-bg" size={10} />}
      </span>
      <span className="shrink-0 font-mono text-text text-xs">{store.name}</span>
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {store.projectsMetadata.map((p) => (
          <ProjectChip key={p.projectId} id={p.projectId} name={p.name} />
        ))}
      </span>
    </button>
  );
}

function ProjectChip({ id, name }: { id: string; name: string }) {
  return (
    <Link
      href={`/vercel/projects/${id}`}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 border border-border px-2 py-0.5 font-mono text-[11px] transition-colors hover:bg-surface-hover hover:text-text"
    >
      {name}
      <ExternalLinkIcon size={8} />
    </Link>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`shrink-0 text-text-tertiary transition-transform ${expanded ? "rotate-90" : ""}`}
    >
      ›
    </span>
  );
}

function ProviderIcon({
  slug,
  iconUrl,
  size,
}: {
  slug: string;
  iconUrl?: string;
  size: number;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const inlineSvg = PROVIDER_LOGOS[slug];

  if (iconUrl && !imgFailed) {
    return (
      <Image
        src={iconUrl}
        alt=""
        width={size}
        height={size}
        unoptimized
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
