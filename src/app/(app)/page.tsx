import Link from "next/link";

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
            <svg width={14} height={14} viewBox="0 0 76 65" fill="currentColor" aria-hidden="true"><path d="M37.5274 0L75.0548 65H0L37.5274 0Z" /></svg>
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
            <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" /></svg>
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
