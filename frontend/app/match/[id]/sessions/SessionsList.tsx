"use client";

import { useState } from "react";
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
  const [checkins, setCheckins] = useState<Checkin[]>(initialCheckins);
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

  async function submitCheckin(sessionId: string, checkin: Omit<Checkin, "id" | "session_id">) {
    const { data, error } = await supabase
      .from("session_checkins")
      .insert({ session_id: sessionId, user_id: currentUserId, ...checkin })
      .select()
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    setCheckins((prev) => [...prev, data as Checkin]);
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
          return (
            <SessionRow
              key={s.id}
              session={s}
              isPast={isPast}
              ownCheckin={ownCheckin}
              onDelete={() => deleteSession(s.id)}
              onSubmitCheckin={(checkin) => submitCheckin(s.id, checkin)}
            />
          );
        })}
      </div>
    </div>
  );
}

function SessionRow({
  session,
  isPast,
  ownCheckin,
  onDelete,
  onSubmitCheckin,
}: {
  session: Session;
  isPast: boolean;
  ownCheckin: Checkin | undefined;
  onDelete: () => void;
  onSubmitCheckin: (checkin: Omit<Checkin, "id" | "session_id">) => void;
}) {
  const [didHappen, setDidHappen] = useState<boolean | null>(null);
  const [helpfulness, setHelpfulness] = useState(3);
  const [continueWanted, setContinueWanted] = useState<boolean | null>(null);
  const [focusNext, setFocusNext] = useState("");

  const formattedTime = new Date(session.scheduled_for).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="concord-lift flex flex-col gap-3 rounded-2xl border border-line bg-paper-raised p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium text-ink">{formattedTime}</p>
        <button onClick={onDelete} className="text-xs text-muted hover:text-danger">
          Remove
        </button>
      </div>

      {!isPast && <p className="text-xs text-muted">Upcoming</p>}

      {isPast && ownCheckin && (
        <p className="text-xs text-accord">You checked in - not visible to your partner.</p>
      )}

      {isPast && !ownCheckin && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (didHappen === null || continueWanted === null) return;
            onSubmitCheckin({
              did_happen: didHappen,
              helpfulness: didHappen ? helpfulness : null,
              continue_wanted: continueWanted,
              focus_next: focusNext.trim() || null,
            });
          }}
          className="flex flex-col gap-3 border-t border-line pt-3"
        >
          <p className="text-xs font-medium text-muted">
            Private check-in - your partner won&apos;t see this
          </p>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">Did the session happen?</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDidHappen(true)}
                className={`rounded-md border px-3 py-1 text-sm ${didHappen === true ? "border-ink bg-ink text-paper" : "border-line text-ink"}`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setDidHappen(false)}
                className={`rounded-md border px-3 py-1 text-sm ${didHappen === false ? "border-ink bg-ink text-paper" : "border-line text-ink"}`}
              >
                No
              </button>
            </div>
          </div>

          {didHappen && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">How helpful was it? (1-5)</label>
              <input
                type="range"
                min={1}
                max={5}
                value={helpfulness}
                onChange={(e) => setHelpfulness(Number(e.target.value))}
                className="accent-ink"
              />
              <p className="text-xs text-ink">{helpfulness}</p>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">Do you want to continue meeting?</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setContinueWanted(true)}
                className={`rounded-md border px-3 py-1 text-sm ${continueWanted === true ? "border-ink bg-ink text-paper" : "border-line text-ink"}`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setContinueWanted(false)}
                className={`rounded-md border px-3 py-1 text-sm ${continueWanted === false ? "border-ink bg-ink text-paper" : "border-line text-ink"}`}
              >
                No
              </button>
            </div>
          </div>

          <label className="flex flex-col gap-1 text-xs text-muted">
            What should you focus on next? (optional)
            <textarea
              value={focusNext}
              onChange={(e) => setFocusNext(e.target.value)}
              rows={2}
              maxLength={1000}
              className="rounded-md border border-line bg-paper px-2 py-1.5 text-sm text-ink focus:border-ink focus:outline-none"
            />
          </label>

          <button
            type="submit"
            disabled={didHappen === null || continueWanted === null}
            className="self-start rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Submit check-in
          </button>
        </form>
      )}
    </div>
  );
}
