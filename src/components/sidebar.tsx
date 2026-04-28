"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  GitBranch,
  KeyRound,
  LayoutGrid,
  Plug,
  Settings,
} from "lucide-react";

import { useToken } from "@/components/token-provider";

type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: ComponentType<{ size?: number }>;
  isConfigure?: boolean;
};
type NavGroup = { label: string; provider: "vercel" | "github"; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "Vercel",
    provider: "vercel",
    items: [
      { key: "vercel-projects", label: "Projects", href: "/vercel/projects", icon: LayoutGrid },
      {
        key: "vercel-integrations",
        label: "Integrations",
        href: "/vercel/integrations",
        icon: Plug,
      },
      { key: "vercel-env-vars", label: "Env Vars", href: "/vercel/env-vars", icon: KeyRound },
      { key: "configure-vercel", label: "Configure", href: "/vercel", icon: Settings, isConfigure: true },
    ],
  },
  {
    label: "GitHub",
    provider: "github",
    items: [
      { key: "github-repos", label: "Repositories", href: "/github/repos", icon: GitBranch },
      { key: "configure-github", label: "Configure", href: "/github", icon: Settings, isConfigure: true },
    ],
  },
];

function getActiveKey(pathname: string): string {
  if (pathname.startsWith("/vercel/integrations")) return "vercel-integrations";
  if (pathname.startsWith("/vercel/env-vars")) return "vercel-env-vars";
  if (pathname.startsWith("/vercel/projects")) return "vercel-projects";
  if (pathname === "/vercel") return "configure-vercel";
  if (pathname.startsWith("/github/repos")) return "github-repos";
  if (pathname === "/github") return "configure-github";
  return "";
}

function DisabledItem({ item }: { item: NavItem }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="relative flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-text-tertiary cursor-not-allowed"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <item.icon size={14} />
      {item.label}
      {showTooltip && (
        <div className="absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded border border-border bg-surface px-2 py-1 text-xs text-text-secondary shadow-lg">
          Configure your token first
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const activeKey = getActiveKey(pathname);
  const { token, githubToken } = useToken();

  const hasToken = (provider: "vercel" | "github") =>
    provider === "vercel" ? Boolean(token) : Boolean(githubToken);

  return (
    <aside className="flex w-[200px] shrink-0 flex-col border-border border-r bg-bg">
      {/* brand */}
      <Link href="/" className="flex h-12 items-center gap-2.5 px-4">
        <svg width={14} height={14} viewBox="0 0 76 65" fill="currentColor" aria-hidden="true"><path d="M37.5274 0L75.0548 65H0L37.5274 0Z" /></svg>
        <span className="text-sm text-text-tertiary">/</span>
        <span className="font-medium text-sm">Cleanup</span>
      </Link>

      {/* nav groups */}
      <nav className="flex flex-1 flex-col gap-4 px-2 pt-2">
        {navGroups.map((group) => (
          <div key={group.label}>
            <span className="px-2 font-medium text-[10px] text-text-tertiary uppercase tracking-wider">
              {group.label}
            </span>
            <div className="mt-1 flex flex-col gap-0.5">
              {group.items.map((item) => {
                const disabled = !item.isConfigure && !hasToken(group.provider);

                if (disabled) {
                  return <DisabledItem key={item.key} item={item} />;
                }

                const active = item.key === activeKey;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                      active
                        ? "bg-surface text-text"
                        : "text-text-secondary hover:bg-surface-hover hover:text-text"
                    }`}
                  >
                    <item.icon size={14} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
