"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/authFetch";
import { buttonClasses } from "@/components/ui/Button";

type Kind = "report" | "block" | "emergency_end";

const KIND_LABELS: Record<Kind, string> = {
  report: "Report",
  block: "Block",
  emergency_end: "Emergency: end this match immediately",
};

export default function ReportButton({
  matchId,
  messageId,
  trigger = "Report or block",
}: {
  matchId: string;
  messageId?: string;
  trigger?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("report");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    setStatus("submitting");
    setError(null);
    try {
      const res = await authFetch(`/matches/${matchId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, reason, message_id: messageId ?? null }),
      });
      const resBody = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(resBody.detail || `Failed (${res.status})`);
      setStatus("done");
      if (resBody.match_ended) router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("idle");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="focus-ring rounded text-xs text-muted underline hover:text-danger"
      >
        {trigger}
      </button>
    );
  }

  if (status === "done") {
    return <p className="text-xs text-muted">Thanks - this has been logged for review.</p>;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-paper-raised p-4"
    >
      <p className="text-sm font-medium text-ink">
        {messageId ? "Report this message" : "Report, block, or end this match"}
      </p>
      {!messageId && (
        <label>
          <span className="sr-only">Report kind</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as Kind)}
            className="focus-ring w-full rounded-[var(--radius-control)] border border-line bg-paper px-2 py-1.5 text-sm text-ink focus:border-ink"
          >
            {(Object.keys(KIND_LABELS) as Kind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        <span className="sr-only">What happened?</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="What happened?"
          className="focus-ring w-full rounded-[var(--radius-control)] border border-line bg-paper px-2 py-1.5 text-sm text-ink focus:border-ink"
        />
      </label>
      <p className="text-xs text-muted">
        Reports go to a private review log -{" "}
        <a href="/community-guidelines" className="focus-ring underline">
          see our community guidelines
        </a>
        .
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={status === "submitting" || !reason.trim()}
          className={buttonClasses("danger", "sm")}
        >
          {status === "submitting" ? "Submitting..." : "Submit"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={status === "submitting"}
          className={buttonClasses("secondary", "sm")}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
