"use client";

export type FilterKey = "zeroDeploys" | "zeroEnvVars" | "zeroIntegrations" | "v0Prefix";

type FilterAccordionProps = {
  open: boolean;
  onToggle: () => void;
  filters: Record<FilterKey, boolean>;
  onFilterToggle: (key: FilterKey) => void;
  counts: Record<FilterKey, number>;
  matchCount: number;
  totalCount: number;
  envLoading: boolean;
};

const chips: { key: FilterKey; label: string }[] = [
  { key: "v0Prefix", label: "v0 Project" },
  { key: "zeroDeploys", label: "No Deploys" },
  { key: "zeroEnvVars", label: "No Environment Variables" },
  { key: "zeroIntegrations", label: "No Integrations" },
];

export function FilterAccordion({
  open,
  onToggle,
  filters,
  onFilterToggle,
  counts,
  matchCount,
  totalCount,
  envLoading,
}: FilterAccordionProps) {
  const activeCount = Object.values(filters).filter(Boolean).length;
  const anyActive = activeCount > 0;

  return (
    <div className="shrink-0 border-b border-border">
      <button
        type="button"
        onClick={onToggle}
        className="flex h-9 w-full items-center gap-2 px-5 text-xs transition-colors hover:bg-surface-hover"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="currentColor"
          className={`text-text-tertiary transition-transform ${open ? "rotate-90" : ""}`}
        >
          <path d="M6 3l5 5-5 5V3z" />
        </svg>
        <span className="text-text-secondary">Recommended Filters</span>
        {activeCount > 0 && (
          <span className="border border-warning/40 bg-warning/10 px-1.5 py-px font-mono text-warning text-[10px]">
            {activeCount}
          </span>
        )}
        <span className="ml-auto flex items-center gap-3">
          {envLoading && (
            <span className="text-text-tertiary text-[10px]">loading env data...</span>
          )}
          <span className="font-mono text-text-secondary text-xs">
            {totalCount} project{totalCount !== 1 ? "s" : ""}
          </span>
        </span>
      </button>

      <div
        className={`overflow-hidden transition-[max-height] duration-200 ${open ? "max-h-24" : "max-h-0"}`}
      >
        <div className="flex flex-wrap items-center gap-2 px-5 pt-3 pb-3">
          {chips.map(({ key, label }) => {
            const active = filters[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => onFilterToggle(key)}
                className={`h-7 border px-2.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-warning bg-warning/10 text-warning"
                    : "border-border text-text-secondary hover:text-text"
                }`}
              >
                {label} ({counts[key]})
              </button>
            );
          })}

          {anyActive && (
            <span className="ml-2 font-mono text-text-tertiary text-xs">
              {matchCount} match{matchCount !== 1 ? "es" : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
