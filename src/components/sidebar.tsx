"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SettingsIcon, VercelIcon } from "@/components/icons";

type NavItem = { key: string; label: string; href: string };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "Vercel",
    items: [
      { key: "vercel-projects", label: "Projects", href: "/vercel/projects" },
      {
        key: "vercel-integrations",
        label: "Integrations",
        href: "/vercel/integrations",
      },
      { key: "vercel-env-vars", label: "Env Vars", href: "/vercel/env-vars" },
    ],
  },
  {
    label: "GitHub",
    items: [
      { key: "github-repos", label: "Repositories", href: "/github/repos" },
    ],
  },
];

function getActiveKey(pathname: string): string {
  if (pathname.startsWith("/vercel/integrations")) return "vercel-integrations";
  if (pathname.startsWith("/vercel/env-vars")) return "vercel-env-vars";
  if (pathname.startsWith("/vercel/projects") || pathname.startsWith("/vercel"))
    return "vercel-projects";
  if (pathname.startsWith("/github/repos") || pathname.startsWith("/github"))
    return "github-repos";
  return "";
}

export function Sidebar() {
  const pathname = usePathname();
  const activeKey = getActiveKey(pathname);

  return (
    <aside className="flex w-[200px] shrink-0 flex-col border-border border-r bg-bg">
      {/* brand */}
      <Link href="/" className="flex h-12 items-center gap-2.5 px-4">
        <VercelIcon size={14} />
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
                const active = item.key === activeKey;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`rounded px-2 py-1.5 text-left text-sm transition-colors ${
                      active
                        ? "bg-surface text-text"
                        : "text-text-secondary hover:bg-surface-hover hover:text-text"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* settings links */}
      <div className="border-border border-t p-2">
        <Link
          href="/vercel"
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-text"
        >
          <VercelIcon size={12} />
          Vercel Settings
        </Link>
        <Link
          href="/github"
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-text"
        >
          <SettingsIcon size={12} />
          GitHub Settings
        </Link>
      </div>
    </aside>
  );
}
