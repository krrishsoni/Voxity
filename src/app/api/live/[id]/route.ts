import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type LiveParticipantRow = {
  id: string;
  user_id: string;
  joined_at: string;
  profiles: { username: string; avatar_url: string | null } | { username: string; avatar_url: string | null }[];
};

function mapParticipants(rows: LiveParticipantRow[] | null | undefined) {
  return (rows ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      userId: row.user_id,
      joinedAt: row.joined_at,
      username: profile?.username ?? "Guest",
      avatarUrl: profile?.avatar_url ?? null,
    };
  });
}

async function loadSessionState(supabase: ReturnType<typeof createClient>, pollId: string) {
  const { data: session } = await supabase
    .from("live_sessions")
    .select("poll_id, host_id, status, room_code, started_at")
    .eq("poll_id", pollId)
    .maybeSingle();

  const { data: participantsRaw } = await supabase
    .from("live_participants")
    .select("id, user_id, joined_at, profiles!inner(username, avatar_url)")
    .eq("poll_id", pollId)
    .order("joined_at", { ascending: true });

  return {
    session,
    participants: mapParticipants(participantsRaw as LiveParticipantRow[] | null),
  };
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { session, participants } = await loadSessionState(supabase, params.id);
  return NextResponse.json({ session, participants });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { action?: "join" | "start"; asHost?: boolean };

  const { data: poll } = await supabase
    .from("polls")
    .select("id, creator_id")
    .eq("id", params.id)
    .single();

  if (!poll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  if (body.action === "start") {
    if (poll.creator_id !== user.id) {
      return NextResponse.json({ error: "Only the poll creator can start voting" }, { status: 403 });
    }

    const { error } = await supabase
      .from("live_sessions")
      .upsert(
        {
          poll_id: params.id,
          host_id: user.id,
          status: "started",
          started_at: new Date().toISOString(),
          room_code: params.id.slice(0, 6).toUpperCase(),
        },
        { onConflict: "poll_id" },
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  }

  const hostId = poll.creator_id;

  const { error: sessionError } = await supabase.from("live_sessions").upsert(
    {
      poll_id: params.id,
      host_id: hostId,
      status: "waiting",
      room_code: params.id.slice(0, 6).toUpperCase(),
    },
    { onConflict: "poll_id" },
  );

  if (sessionError && !sessionError.message.toLowerCase().includes("duplicate")) {
    return NextResponse.json({ error: sessionError.message }, { status: 400 });
  }

  const { error: participantError } = await supabase.from("live_participants").upsert(
    {
      poll_id: params.id,
      user_id: user.id,
    },
    { onConflict: "poll_id,user_id" },
  );

  if (participantError) {
    return NextResponse.json({ error: participantError.message }, { status: 400 });
  }

  const state = await loadSessionState(supabase, params.id);

  return NextResponse.json({
    ...state,
    isHost: hostId === user.id,
  });
}