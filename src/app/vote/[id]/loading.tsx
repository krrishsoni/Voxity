import { VotePanelSkeleton } from "@/components/skeletons";

export default function VoteLoading() {
  return (
    <div className="mx-auto max-w-2xl">
      <VotePanelSkeleton />
    </div>
  );
}
