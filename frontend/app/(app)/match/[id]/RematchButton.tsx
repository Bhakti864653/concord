"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/authFetch";

const REASONS = [
  { value: "availability_conflict", label: "Availability conflict" },
  { value: "goals_changed", label: "My goals changed" },
  { value: "mentor_unresponsive", label: "Mentor unresponsive" },
  { value: "need_different_expertise", label: "Need different expertise" },
  { value: "personal_circumstances", label: "Personal circumstances" },
] as const;

export default function RematchButton({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]["value"]>(REASONS[0].value);
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setStatus("submitting");
    setError(null);
    try {
      const res = await authFetch(`/matches/${matchId}/rematch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.detail || `Failed (${res.status})`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("idle");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="self-start text-xs text-muted underline hover:text-ink"
      >
        Request a rematch
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-paper-raised p-4">
      <p className="text-sm font-medium text-ink">Request a rematch</p>
      <p className="text-xs text-muted">
        This quietly ends the current match - your mentor/mentee won&apos;t be notified of your
        reason, and you&apos;ll be included in the next matching round.
      </p>
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value as (typeof REASONS)[number]["value"])}
        className="rounded-md border border-line bg-paper px-2 py-1.5 text-sm text-ink focus-ring focus:border-ink"
      >
        {REASONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          disabled={status === "submitting"}
          className="rounded-md bg-danger px-3 py-1.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {status === "submitting" ? "Ending match..." : "Confirm rematch request"}
        </button>
        <button
          onClick={() => setOpen(false)}
          disabled={status === "submitting"}
          className="rounded-md border border-line px-3 py-1.5 text-sm text-ink hover:opacity-70"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
