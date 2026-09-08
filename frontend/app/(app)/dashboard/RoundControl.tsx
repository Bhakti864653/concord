"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/authFetch";

type RoundStatus = "preferences_open" | "preferences_locked" | "matching_in_progress" | "results_available";

const STATUS_LABELS: Record<RoundStatus, string> = {
  preferences_open: "Preferences open",
  preferences_locked: "Preferences locked",
  matching_in_progress: "Matching in progress",
  results_available: "Results available",
};

const ADVANCE_LABELS: Record<RoundStatus, string> = {
  preferences_open: "Lock preferences",
  preferences_locked: "Start matching",
  matching_in_progress: "Run matching & publish results",
  results_available: "Start next round",
};

const ADVANCE_DESCRIPTIONS: Record<RoundStatus, string> = {
  preferences_open:
    "Freezes everyone's current rankings so matching runs on a stable list - no more edits until the next round.",
  preferences_locked:
    "Runs the matching algorithm against locked rankings and mentor capacity. Doesn't touch existing active matches.",
  matching_in_progress:
    "Publishes results - newly matched pairs can see each other and start chatting. Still-unmatched mentees stay waitlisted.",
  results_available:
    "Reopens preferences app-wide so mentees and mentors can update their rankings for the next round.",
};

export default function RoundControl({ status, isAdmin }: { status: RoundStatus; isAdmin: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleAdvance() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await authFetch("/matching/rounds/advance", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.detail || `Failed (${res.status})`);
      if (typeof body.newly_matched_count === "number") {
        setMessage(
          `Matched ${body.newly_matched_count} mentee${body.newly_matched_count === 1 ? "" : "s"}, ${body.still_waitlisted_count} still waitlisted.`,
        );
      }
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-line bg-paper-raised px-3 py-1 text-xs font-medium text-muted">
          Round: {STATUS_LABELS[status]}
        </span>
        {isAdmin && (
          <button
            onClick={handleAdvance}
            disabled={busy}
            className="rounded-md border border-accord bg-accord-tint px-3 py-1.5 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Working..." : `${ADVANCE_LABELS[status]} (admin)`}
          </button>
        )}
      </div>
      {isAdmin && !message && (
        <p className="max-w-[220px] text-right text-xs text-muted">{ADVANCE_DESCRIPTIONS[status]}</p>
      )}
      {message && <p className="text-xs text-muted">{message}</p>}
    </div>
  );
}
