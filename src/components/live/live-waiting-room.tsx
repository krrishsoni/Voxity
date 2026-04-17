"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UserAvatar } from "@/components/avatar";

type Participant = {
  id: string;
  userId: string;
  joinedAt: string;
  username: string;
  avatarUrl: string | null;
};

type LiveWaitingRoomProps = {
  pollId: string;
  pollTitle: string;
};

export function LiveWaitingRoom({ pollId, pollTitle }: LiveWaitingRoomProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [status, setStatus] = useState<"waiting" | "started" | "closed">("waiting");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function refreshState() {
      const response = await fetch(`/api/live/${pollId}`);
      const data = await response.json();
      if (!mounted || !response.ok) return;
      setParticipants(data.participants ?? []);
      const nextStatus = data.session?.status ?? "waiting";
      setStatus(nextStatus);
      if (nextStatus === "started") {
        router.replace(`/vote/${pollId}`);
      }
    }

    async function joinRoom() {
      const response = await fetch(`/api/live/${pollId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", asHost: false }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (mounted) setError(data.error || "Could not join waiting room");
        return;
      }

      if (!mounted) return;
      setParticipants(data.participants ?? []);
      setStatus(data.session?.status ?? "waiting");

      if (data.session?.status === "started") {
        router.replace(`/vote/${pollId}`);
      }
    }

    joinRoom();

    const channel = supabase
      .channel(`live-room-${pollId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_participants",
          filter: `poll_id=eq.${pollId}`,
        },
        () => refreshState(),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_sessions",
          filter: `poll_id=eq.${pollId}`,
        },
        (payload) => {
          const nextStatus = (payload.new as { status?: "waiting" | "started" | "closed" }).status ?? "waiting";
          if (!mounted) return;
          setStatus(nextStatus);
          if (nextStatus === "started") {
            router.replace(`/vote/${pollId}`);
          }
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [pollId, router, supabase]);

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <div className="card text-center">
        <p className="chip mx-auto w-fit">Live session</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">{pollTitle}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Waiting for host to start voting. You will be redirected automatically.
        </p>

        <div className="mt-3 inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="live-dot" />
          Status: {status}
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Participants ({participants.length})</h2>
        <div className="mt-3 space-y-2">
          {participants.map((participant) => (
            <div key={participant.id} className="inner-card flex items-center gap-3 p-3">
              <UserAvatar username={participant.username} avatarUrl={participant.avatarUrl} size="md" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{participant.username}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Joined</p>
              </div>
            </div>
          ))}
        </div>

        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </div>
    </section>
  );
}
