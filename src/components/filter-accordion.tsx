"use client";

import { useState } from "react";

import {
  Check as CheckIcon,
  ChevronRight as ChevronIcon,
  LayoutGrid as GridIcon,
} from "lucide-react";

export type FilterKey =
  | "zeroDeploys"
  | "zeroEnvVars"
  | "zeroIntegrations"
  | "v0Prefix";

export type GroupByKey = "year" | "creator" | "recentUser";

type FilterAccordionProps = {
  open: boolean;
  onToggle: () => void;
  filters: Record<FilterKey, boolean>;
  onFilterToggle: (key: FilterKey) => void;
  counts: Record<FilterKey, number>;
  matchCount: number;
  totalCount: number;
  envLoading: boolean;
  groupBy: GroupByKey | null;
  onGroupByChange: (key: GroupByKey | null) => void;
};

const chips: { key: FilterKey; label: string }[] = [
  { key: "v0Prefix", label: "v0 Project" },
  { key: "zeroDeploys", label: "No Deploys" },
  { key: "zeroEnvVars", label: "No Environment Variables" },
  { key: "zeroIntegrations", label: "No Integrations" },
];

const groupByOptions: { key: GroupByKey | null; label: string }[] = [
  { key: null, label: "None" },
  { key: "year", label: "Year" },
  { key: "creator", label: "Creator" },
  { key: "recentUser", label: "Most Recent User" },
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
  groupBy,
  onGroupByChange,
}: FilterAccordionProps) {
  const activeCount = Object.values(filters).filter(Boolean).length;
  const anyActive = activeCount > 0;
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div className="shrink-0 border-border border-b">
      <div
        onClick={onToggle}
        className="flex h-9 w-full cursor-pointer items-center gap-2 px-5 text-xs transition-colors hover:bg-surface-hover"
      >
        <ChevronIcon
          size={12}
          className={`text-text-tertiary transition-transform ${open ? "rotate-90" : ""}`}
        />
        <span className="text-text-secondary">Recommended Filters</span>
        {activeCount > 0 && (
          <span className="border border-warning/40 bg-warning/10 px-1.5 py-px font-mono text-[10px] text-warning">
            {activeCount}
          </span>
        )}
        <span className="ml-auto flex items-center gap-3">
          {envLoading && (
            <span className="text-[10px] text-text-tertiary">
              loading env data...
            </span>
          )}
          <span className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDropdownOpen((v) => !v);
              }}
              className={`flex items-center gap-1.5 rounded px-1.5 py-1 transition-colors hover:bg-surface-active ${
                groupBy ? "text-text" : "text-text-tertiary"
              }`}
            >
              <GridIcon size={12} />
              {groupBy && (
                <span className="text-[10px]">
                  {groupByOptions.find((o) => o.key === groupBy)?.label}
                </span>
              )}
            </button>
            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDropdownOpen(false);
                  }}
                />
                <div className="absolute right-0 top-full z-30 mt-1 w-44 border border-border bg-surface py-1 shadow-lg">
                  {groupByOptions.map(({ key, label }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onGroupByChange(key);
                        setDropdownOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-surface-hover ${
                        groupBy === key ? "text-text" : "text-text-secondary"
                      }`}
                    >
                      <span className="w-3">
                        {groupBy === key && <CheckIcon size={10} />}
                      </span>
                      <span className={groupBy === key ? "font-medium" : ""}>
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </span>
          <span className="font-mono text-text-secondary text-xs">
            {totalCount} project{totalCount !== 1 ? "s" : ""}
          </span>
        </span>
      </div>

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
                className={`h-7 border px-2.5 font-medium text-xs transition-colors ${
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
