"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useMemo } from "react";

import { TeamSwitcher } from "@/components/team-switcher";
import { useToken } from "@/components/token-provider";

const SEARCH_PLACEHOLDERS: Record<string, string> = {
  "/vercel/projects": "Search projects...",
  "/vercel/integrations": "Search integrations...",
  "/vercel/env-vars": "Search env vars...",
};

function shouldShowSearch(pathname: string): boolean {
  if (pathname === "/vercel") return false;
  if (/^\/vercel\/projects\/[^/]+/.test(pathname)) return false;
  return Object.keys(SEARCH_PLACEHOLDERS).some((prefix) =>
    pathname.startsWith(prefix),
  );
}

function getPlaceholder(pathname: string): string {
  for (const [prefix, placeholder] of Object.entries(SEARCH_PLACEHOLDERS)) {
    if (pathname.startsWith(prefix)) return placeholder;
  }
  return "Search...";
}

export default function VercelLayout({ children }: { children: ReactNode }) {
  const { token } = useToken();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const query = searchParams.get("q") ?? "";
  const showSearch = useMemo(() => shouldShowSearch(pathname), [pathname]);
  const placeholder = useMemo(() => getPlaceholder(pathname), [pathname]);

  const handleSearch = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams);
      if (value) {
        params.set("q", value);
      } else {
        params.delete("q");
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, searchParams, router],
  );

  if (!token) return <>{children}</>;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-3 border-border border-b px-5 py-3">
        {showSearch && (
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={placeholder}
            className="h-8 w-64 border border-border bg-surface px-3 text-sm outline-none transition-colors placeholder:text-text-tertiary focus:border-text-secondary"
          />
        )}
        <div className="ml-auto">
          <TeamSwitcher />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
