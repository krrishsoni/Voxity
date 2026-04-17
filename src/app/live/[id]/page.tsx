import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LiveWaitingRoom } from "@/components/live/live-waiting-room";

export default async function LivePage({ params, searchParams }: { params: { id: string }; searchParams: { source?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: poll } = await supabase
    .from("polls")
    .select("id, title, creator_id")
    .eq("id", params.id)
    .single();

  if (!poll) {
    notFound();
  }

  if (searchParams.source === "qr") {
    await supabase.rpc("increment_qr_scan", { p_poll_id: params.id });
  }

  if (poll.creator_id === user.id) {
    redirect(`/host/${params.id}/lobby`);
  }

  return <LiveWaitingRoom pollId={params.id} pollTitle={poll.title} />;
}
