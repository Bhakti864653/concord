"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { buttonClasses } from "@/components/ui/Button";

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
        match_id: matchId,
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

      <form onSubmit={addSession} className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            label="Session date & time"
            hideLabel
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
          />
        </div>
        <button type="submit" disabled={!when} className={buttonClasses("primary")}>
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
            <Card key={s.id} padding="sm" className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="font-medium text-ink">{formattedTime}</p>
                <button
                  onClick={() => deleteSession(s.id)}
                  className="focus-ring rounded text-xs text-muted hover:text-danger"
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
                  className="focus-ring text-xs font-medium text-mentee underline"
                >
                  Check in on this session →
                </Link>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
