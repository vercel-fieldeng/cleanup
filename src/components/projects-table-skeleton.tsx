export function ProjectsTableSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* toolbar skeleton */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-border border-b px-5 py-3">
        <div className="h-8 w-64 animate-pulse rounded bg-surface" />
        <div className="ml-auto h-8 w-40 animate-pulse rounded bg-surface" />
      </div>

      {/* filter accordion skeleton */}
      <div className="shrink-0 border-border border-b">
        <div className="flex h-9 items-center gap-2 px-5">
          <div className="h-3 w-3 animate-pulse rounded bg-surface" />
          <div className="h-3 w-12 animate-pulse rounded bg-surface" />
        </div>
      </div>

      {/* table skeleton */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-bg">
            <tr className="border-border border-b text-left text-text-secondary text-xs">
              <th className="w-10 px-5 py-2.5">
                <div className="h-3.5 w-3.5 animate-pulse rounded-sm bg-surface" />
              </th>
              {[
                "Project",
                "Framework",
                "Repository",
                "Created",
                "Deploys",
                "Env Vars",
                "Integrations",
              ].map((h) => (
                <th key={h} className="px-4 py-2.5">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 12 }).map((_, i) => (
              <tr
                key={`project-skeleton-row-${i + 1}`}
                className="border-border border-b"
              >
                <td className="px-5 py-2.5">
                  <div className="h-3.5 w-3.5 animate-pulse rounded-sm bg-surface" />
                </td>
                <td className="px-4 py-2.5">
                  <div className="h-4 w-28 animate-pulse rounded bg-surface" />
                </td>
                <td className="px-4 py-2.5">
                  <div className="h-3 w-16 animate-pulse rounded bg-surface" />
                </td>
                <td className="px-4 py-2.5">
                  <div className="h-3 w-32 animate-pulse rounded bg-surface" />
                </td>
                <td className="px-4 py-2.5">
                  <div className="h-3 w-20 animate-pulse rounded bg-surface" />
                </td>
                <td className="px-4 py-2.5">
                  <div className="h-3 w-8 animate-pulse rounded bg-surface" />
                </td>
                <td className="px-4 py-2.5">
                  <div className="h-3 w-8 animate-pulse rounded bg-surface" />
                </td>
                <td className="px-4 py-2.5">
                  <div className="h-3 w-8 animate-pulse rounded bg-surface" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
