import Link from "next/link";

import { GithubIcon, VercelIcon } from "@/components/icons";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4">
      <div className="flex flex-col items-center gap-3">
        <h1 className="font-semibold text-xl">Cleanup</h1>
        <p className="text-sm text-text-secondary">
          Bulk manage and clean up your Vercel projects and GitHub repositories
        </p>
      </div>
      <div className="grid w-full max-w-3xl gap-4 md:grid-cols-2">
        <Link
          href="/vercel"
          className="flex min-h-40 flex-col justify-between border border-border bg-surface p-5 transition-colors hover:bg-surface-hover"
        >
          <div className="flex items-center gap-3">
            <VercelIcon size={14} />
            <span className="font-medium text-sm">Vercel</span>
          </div>
          <div>
            <p className="text-sm">
              Manage projects, integrations, env vars, and access.
            </p>
            <p className="mt-2 text-text-secondary text-xs">
              Open Vercel workspace
            </p>
          </div>
        </Link>
        <Link
          href="/github"
          className="flex min-h-40 flex-col justify-between border border-border bg-surface p-5 transition-colors hover:bg-surface-hover"
        >
          <div className="flex items-center gap-3">
            <GithubIcon size={16} />
            <span className="font-medium text-sm">GitHub</span>
          </div>
          <div>
            <p className="text-sm">
              Manage repositories, inspect commits, and control org access.
            </p>
            <p className="mt-2 text-text-secondary text-xs">
              Open GitHub workspace
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
