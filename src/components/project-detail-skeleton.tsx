import { Section } from "@/components/section";

function SkeletonBar({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded bg-surface-hover ${className}`} />
  );
}

export function ProjectDetailSkeleton() {
  return (
    <div className="px-6 py-8">
      {/* breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-text-secondary text-sm">
        <SkeletonBar className="h-4 w-14" />
        <span className="text-text-tertiary">/</span>
        <SkeletonBar className="h-4 w-28" />
      </div>

      {/* project header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <SkeletonBar className="h-7 w-44" />
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <SkeletonBar className="h-3.5 w-16" />
            <SkeletonBar className="h-3.5 w-36" />
            <SkeletonBar className="h-3.5 w-28" />
          </div>
        </div>
        <SkeletonBar className="h-8 w-[130px] shrink-0" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* recent deployments */}
        <Section title="Recent Deployments" count={0}>
          <div className="flex flex-col divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1 py-2.5">
                <div className="flex items-center gap-2">
                  <SkeletonBar className="h-2 w-2 !rounded-full" />
                  <SkeletonBar className="h-3.5 w-52" />
                </div>
                <div className="flex items-center gap-x-5 pl-4">
                  <SkeletonBar className="h-3 w-[120px]" />
                  <SkeletonBar className="h-3 w-[120px]" />
                  <SkeletonBar className="h-3 w-[180px]" />
                  <SkeletonBar className="ml-auto h-[18px] w-[18px] !rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* environment variables */}
        <Section title="Environment Variables" count={0}>
          <div className="flex flex-col divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-start justify-between gap-4 py-2.5"
              >
                <div className="flex flex-col gap-1">
                  <SkeletonBar className="h-3.5 w-40" />
                  <SkeletonBar className="h-2.5 w-28" />
                </div>
                <SkeletonBar className="h-3 w-16 shrink-0" />
              </div>
            ))}
          </div>
        </Section>

        {/* storage */}
        <Section title="Storage" count={0}>
          <div className="flex flex-col divide-y divide-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2.5"
              >
                <SkeletonBar className="h-3.5 w-32" />
                <SkeletonBar className="h-3 w-20" />
              </div>
            ))}
          </div>
        </Section>

        {/* git editors */}
        <Section title="Git Editors" count={0}>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border border-border px-3 py-1.5">
                <SkeletonBar className="h-3.5 w-20" />
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
