import type { ReactNode } from "react";

import { ExternalLink as ExternalLinkIcon } from "lucide-react";

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
    <div className="flex h-[350px] min-w-0 flex-col border border-border bg-surface p-4">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-sm transition-colors hover:text-text-secondary"
          >
            {title}
            <ExternalLinkIcon size={12} />
          </a>
        ) : (
          <h2 className="font-medium text-sm">{title}</h2>
        )}
        <span className="font-mono text-text-tertiary text-xs">{count}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto pr-2">{children}</div>
    </div>
  );
}
