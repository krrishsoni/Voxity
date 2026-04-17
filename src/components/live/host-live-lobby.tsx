"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { createClient } from "@/lib/supabase/client";
import { UserAvatar } from "@/components/avatar";

type Participant = {
  id: string;
  userId: string;
  joinedAt: string;
  username: string;
  avatarUrl: string | null;
};

type HostLiveLobbyProps = {
  pollId: string;
  pollTitle: string;
  joinUrl: string;
};

export function HostLiveLobby({ pollId, pollTitle, joinUrl }: HostLiveLobbyProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [status, setStatus] = useState<"waiting" | "started" | "closed">("waiting");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function refreshState() {
      const response = await fetch(`/api/live/${pollId}`);
      const data = await response.json();
      if (!mounted || !response.ok) return;
      setParticipants(data.participants ?? []);
      setStatus(data.session?.status ?? "waiting");
    }

    async function joinHostRoom() {
      const response = await fetch(`/api/live/${pollId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", asHost: true }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (mounted) setError(data.error || "Could not open host lobby");
        return;
      }

      if (!mounted) return;
      setParticipants(data.participants ?? []);
      setStatus(data.session?.status ?? "waiting");
    }

    joinHostRoom();

    const channel = supabase
      .channel(`host-room-${pollId}`)
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
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [pollId, supabase]);

  async function startVoting() {
    setBusy(true);
    setError(null);

    const response = await fetch(`/api/live/${pollId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Could not start voting");
      setBusy(false);
      return;
    }

    setBusy(false);
    router.push(`/vote/${pollId}`);
  }

  return (
    <section className="mx-auto max-w-4xl space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="chip w-fit">Host lobby</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{pollTitle}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Track joiners and start the live vote when ready.</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Status: {status}</p>
        </div>

        <button className="btn-primary" type="button" onClick={startVoting} disabled={busy || participants.length <= 1}>
          {busy ? "Starting..." : "Start Voting"}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Join QR</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Participants scan and enter waiting room.</p>

          <div className="mt-4 inline-flex rounded-xl bg-white p-3 shadow-sm">
            <QRCode value={joinUrl} size={180} />
          </div>

          <p className="mt-3 break-all text-xs text-slate-500 dark:text-slate-400">{joinUrl}</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Participants ({participants.length})</h2>
          <div className="mt-3 space-y-2">
            {participants.map((participant) => (
              <div key={participant.id} className="inner-card flex items-center gap-3 p-3">
                <UserAvatar username={participant.username} avatarUrl={participant.avatarUrl} size="md" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{participant.username}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Ready in lobby</p>
                </div>
              </div>
            ))}
          </div>

          {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}
