"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useToken } from "@/components/token-provider";

type NavItem = { key: string; label: string; href: string };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "Vercel",
    items: [
      { key: "projects", label: "Projects", href: "/" },
      { key: "integrations", label: "Integrations", href: "/integrations" },
      { key: "env-vars", label: "Env Vars", href: "/env-vars" },
    ],
  },
  {
    label: "GitHub",
    items: [
      { key: "repositories", label: "Repositories", href: "/repositories" },
    ],
  },
];

function getActiveKey(pathname: string): string {
  if (pathname.startsWith("/integrations")) return "integrations";
  if (pathname.startsWith("/env-vars")) return "env-vars";
  if (pathname.startsWith("/repositories")) return "repositories";
  return "projects";
}

export function Sidebar() {
  const { clearToken } = useToken();
  const pathname = usePathname();
  const activeKey = getActiveKey(pathname);

  return (
    <aside className="flex w-[200px] shrink-0 flex-col border-r border-border bg-bg">
      {/* brand */}
      <div className="flex h-12 items-center gap-2.5 px-4">
        <svg
          height="14"
          viewBox="0 0 76 65"
          fill="white"
          aria-label="Vercel"
        >
          <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
        </svg>
        <span className="text-text-tertiary text-sm">/</span>
        <span className="text-sm font-medium">Cleanup</span>
      </div>

      {/* nav groups */}
      <nav className="flex flex-1 flex-col gap-4 px-2 pt-2">
        {navGroups.map((group) => (
          <div key={group.label}>
            <span className="px-2 text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
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

      {/* disconnect */}
      <div className="border-t border-border p-2">
        <button
          type="button"
          onClick={clearToken}
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-text"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M6 2H3.5A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14H6M10.5 11.5L14 8l-3.5-3.5M6 8h8" />
          </svg>
          Disconnect
        </button>
      </div>
    </aside>
  );
}
