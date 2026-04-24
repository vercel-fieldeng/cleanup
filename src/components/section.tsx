import type { ReactNode } from "react";

export function Section({
  title,
  count,
  href,
  children,
}: {
  title: string;
  count: number;
  href?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 h-[350px] flex-col border border-border bg-surface p-4">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-text-secondary"
          >
            {title}
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h7v7M13 3L6 10" /></svg>
          </a>
        ) : (
          <h2 className="text-sm font-medium">{title}</h2>
        )}
        <span className="font-mono text-text-tertiary text-xs">{count}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto pr-2">{children}</div>
    </div>
  );
}
