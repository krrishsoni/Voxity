/* ─── Skeleton primitives ─── */
export function SkeletonBox({ className = "" }: { className?: string }) {
  return (
    <div
      className={`skeleton-shimmer rounded-xl ${className}`}
    />
  );
}

/* ─── Home page skeletons ─── */
export function HeroSkeleton() {
  return (
    <section className="card relative overflow-hidden rounded-3xl p-6 sm:p-8">
      <SkeletonBox className="mb-4 h-5 w-36 rounded-full" />
      <SkeletonBox className="mt-4 h-10 w-3/4" />
      <SkeletonBox className="mt-3 h-5 w-1/2" />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="inner-card p-3">
            <SkeletonBox className="h-3 w-20" />
            <SkeletonBox className="mt-2 h-7 w-12" />
          </div>
        ))}
      </div>
      <div className="mt-6 flex gap-3">
        <SkeletonBox className="h-9 w-32 rounded-xl" />
        <SkeletonBox className="h-9 w-36 rounded-xl" />
      </div>
    </section>
  );
}

export function PollCardSkeleton() {
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <SkeletonBox className="h-5 w-16 rounded-full" />
        <SkeletonBox className="h-5 w-12 rounded-full" />
      </div>
      <SkeletonBox className="h-5 w-4/5" />
      <SkeletonBox className="mt-2 h-4 w-full" />
      <SkeletonBox className="mt-1 h-4 w-2/3" />
    </div>
  );
}

export function PollGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonBox className="h-7 w-36" />
        <SkeletonBox className="h-4 w-24" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <PollCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

/* ─── Vote page skeleton ─── */
export function VotePanelSkeleton() {
  return (
    <div className="space-y-4">
      {/* header card */}
      <section className="card flex flex-wrap items-center justify-between gap-2">
        <div>
          <SkeletonBox className="h-7 w-64" />
          <SkeletonBox className="mt-2 h-4 w-36" />
        </div>
        <div className="flex gap-2">
          <SkeletonBox className="h-9 w-20 rounded-xl" />
          <SkeletonBox className="h-9 w-20 rounded-xl" />
        </div>
      </section>

      {/* options card */}
      <section className="card">
        <div className="mb-4 flex items-center justify-between">
          <SkeletonBox className="h-5 w-28 rounded-full" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="inner-card p-3">
              <div className="flex items-center justify-between gap-2">
                <SkeletonBox className="h-5 w-40" />
                <SkeletonBox className="h-7 w-16 rounded-xl" />
              </div>
              <SkeletonBox className="mt-3 h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ─── Leaderboard skeleton ─── */
export function LeaderboardSkeleton() {
  return (
    <section className="mx-auto max-w-4xl space-y-4">
      {/* header card */}
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <SkeletonBox className="h-7 w-48" />
          <SkeletonBox className="mt-2 h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <SkeletonBox className="h-9 w-40 rounded-xl" />
          <SkeletonBox className="h-9 w-20 rounded-xl" />
        </div>
      </div>

      {/* podium */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card">
            <SkeletonBox className="h-3 w-6" />
            <SkeletonBox className="mt-2 h-6 w-32" />
            <SkeletonBox className="mt-1 h-3 w-20" />
            <SkeletonBox className="mt-4 h-8 w-16" />
            <SkeletonBox className="mt-1 h-3 w-6" />
          </div>
        ))}
      </div>

      {/* rest list */}
      <div className="card space-y-2">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="inner-card flex items-center justify-between px-4 py-3">
            <div>
              <SkeletonBox className="h-4 w-36" />
              <SkeletonBox className="mt-1 h-3 w-20" />
            </div>
            <SkeletonBox className="h-4 w-16" />
          </div>
        ))}
      </div>
    </section>
  );
}
