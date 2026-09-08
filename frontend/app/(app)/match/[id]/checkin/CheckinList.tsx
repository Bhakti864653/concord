"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Session = { id: string; scheduled_for: string };
type Checkin = { id: string; session_id: string };

export default function CheckinList({
  currentUserId,
  initialSessions,
  initialCheckins,
}: {
  currentUserId: string;
  initialSessions: Session[];
  initialCheckins: Checkin[];
}) {
  const [supabase] = useState(() => createClient());
  const [checkins, setCheckins] = useState<Checkin[]>(initialCheckins);
  const [error, setError] = useState<string | null>(null);

  const pending = initialSessions.filter(
    (s) => new Date(s.scheduled_for) < new Date() && !checkins.some((c) => c.session_id === s.id),
  );

  async function submit(
    sessionId: string,
    checkin: {
      did_happen: boolean;
      helpfulness: number | null;
      continue_wanted: boolean;
      focus_next: string | null;
    },
  ) {
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

  if (pending.length === 0) {
    return (
      <p className="text-sm text-muted">
        No check-ins pending right now - they show up here once a logged session&apos;s time has
        passed.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-danger">{error}</p>}
      {pending.map((s) => (
        <CheckinForm
          key={s.id}
          scheduledFor={s.scheduled_for}
          onSubmit={(checkin) => submit(s.id, checkin)}
        />
      ))}
    </div>
  );
}

function CheckinForm({
  scheduledFor,
  onSubmit,
}: {
  scheduledFor: string;
  onSubmit: (checkin: {
    did_happen: boolean;
    helpfulness: number | null;
    continue_wanted: boolean;
    focus_next: string | null;
  }) => void;
}) {
  const [didHappen, setDidHappen] = useState<boolean | null>(null);
  const [helpfulness, setHelpfulness] = useState(3);
  const [continueWanted, setContinueWanted] = useState<boolean | null>(null);
  const [focusNext, setFocusNext] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const formattedTime = new Date(scheduledFor).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  if (submitted) {
    return (
      <div className="concord-lift rounded-2xl border border-line bg-paper-raised p-5">
        <p className="text-sm text-accord">
          Thanks - submitted privately for {formattedTime}. Your partner won&apos;t see this.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (didHappen === null || continueWanted === null) return;
        onSubmit({
          did_happen: didHappen,
          helpfulness: didHappen ? helpfulness : null,
          continue_wanted: continueWanted,
          focus_next: focusNext.trim() || null,
        });
        setSubmitted(true);
      }}
      className="concord-lift flex flex-col gap-4 rounded-2xl border border-line bg-paper-raised p-5"
    >
      <div>
        <p className="text-xs font-bold text-muted">PRIVATE CHECK-IN · ABOUT 2 MINUTES</p>
        <h3 className="mt-1 font-display text-lg font-semibold text-ink">
          How did your {formattedTime} session feel?
        </h3>
        <p className="text-sm text-muted">
          Your answers are private. They help Concord support the match without turning
          mentorship into a public rating.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-ink">Did the session happen?</label>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Yes, as planned", value: true },
            { label: "No", value: false },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setDidHappen(opt.value)}
              className={`rounded-xl border px-4 py-2 text-left text-sm ${
                didHappen === opt.value
                  ? "border-mentee bg-mentee-tint text-mentee"
                  : "border-line text-ink hover:border-mentee"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {didHappen && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-ink">How helpful was it? (1-5)</label>
          <input
            type="range"
            min={1}
            max={5}
            value={helpfulness}
            onChange={(e) => setHelpfulness(Number(e.target.value))}
            className="accent-mentee"
          />
          <p className="text-xs text-muted">{helpfulness}</p>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-ink">Would you like to continue this match?</label>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Yes, definitely", value: true },
            { label: "I'm unsure / need support", value: false },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setContinueWanted(opt.value)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                continueWanted === opt.value
                  ? "border-mentee bg-mentee-tint text-mentee"
                  : "border-line text-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        What should you focus on next? (optional)
        <textarea
          value={focusNext}
          onChange={(e) => setFocusNext(e.target.value)}
          rows={2}
          maxLength={1000}
          className="rounded-md border border-line bg-paper px-2 py-1.5 text-sm font-normal text-ink focus:border-ink focus:outline-none"
        />
      </label>

      <button
        type="submit"
        disabled={didHappen === null || continueWanted === null}
        className="self-start rounded-xl bg-mentee px-5 py-2.5 text-sm font-bold text-paper-raised transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        Submit privately
      </button>
    </form>
  );
}
