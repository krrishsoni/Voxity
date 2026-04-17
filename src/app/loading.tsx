import { HeroSkeleton, PollGridSkeleton } from "@/components/skeletons";

export default function HomeLoading() {
  return (
    <div className="space-y-8">
      <HeroSkeleton />
      <PollGridSkeleton count={6} />
    </div>
  );
}
