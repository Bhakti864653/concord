"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Session = {
  id: string;
  scheduled_for: string;
  created_by: string;
  created_at: string;
};

type Checkin = {
  id: string;
  session_id: string;
  did_happen: boolean;
  helpfulness: number | null;
  continue_wanted: boolean;
  focus_next: string | null;
};

export default function SessionsList({
  matchId,
  currentUserId,
  initialSessions,
  initialCheckins,
}: {
  matchId: string;
  currentUserId: string;
  initialSessions: Session[];
  initialCheckins: Checkin[];
}) {
  const [supabase] = useState(() => createClient());
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [checkins] = useState<Checkin[]>(initialCheckins);
  const [when, setWhen] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function addSession(e: React.FormEvent) {
    e.preventDefault();
    if (!when) return;
    const { data, error } = await supabase
      .from("match_sessions")
      .insert({
        match_mentee_id: matchId,
        scheduled_for: new Date(when).toISOString(),
        created_by: currentUserId,
      })
      .select()
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    setSessions((prev) => [data as Session, ...prev]);
    setWhen("");
  }

  async function deleteSession(id: string) {
    const { error } = await supabase.from("match_sessions").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-danger">{error}</p>}

      <form onSubmit={addSession} className="flex gap-2">
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className="flex-1 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
        />
        <button
          type="submit"
          disabled={!when}
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Log session
        </button>
      </form>

      {sessions.length === 0 && (
        <p className="text-sm text-muted">No sessions logged yet.</p>
      )}

      <div className="flex flex-col gap-3">
        {sessions.map((s) => {
          const isPast = new Date(s.scheduled_for) < new Date();
          const ownCheckin = checkins.find((c) => c.session_id === s.id);
          const formattedTime = new Date(s.scheduled_for).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          });
          return (
            <div
              key={s.id}
              className="concord-lift flex flex-col gap-2 rounded-2xl border border-line bg-paper-raised p-4"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-ink">{formattedTime}</p>
                <button
                  onClick={() => deleteSession(s.id)}
                  className="text-xs text-muted hover:text-danger"
                >
                  Remove
                </button>
              </div>
              {!isPast && <p className="text-xs text-muted">Upcoming</p>}
              {isPast && ownCheckin && (
                <p className="text-xs text-accord">You checked in - not visible to your partner.</p>
              )}
              {isPast && !ownCheckin && (
                <Link
                  href={`/match/${matchId}/checkin`}
                  className="text-xs font-medium text-mentee underline"
                >
                  Check in on this session →
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
