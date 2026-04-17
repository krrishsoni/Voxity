import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { HostLiveLobby } from "@/components/live/host-live-lobby";
import { createClient } from "@/lib/supabase/server";

function getRequestOrigin() {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");

  if (host) {
    return `${proto}://${host}`;
  }

  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export default async function HostLobbyPage({ params }: { params: { id: string } }) {
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

  if (poll.creator_id !== user.id) {
    redirect(`/live/${params.id}`);
  }

  const joinUrl = `${getRequestOrigin()}/live/${params.id}?source=qr`;

  return <HostLiveLobby pollId={poll.id} pollTitle={poll.title} joinUrl={joinUrl} />;
}
