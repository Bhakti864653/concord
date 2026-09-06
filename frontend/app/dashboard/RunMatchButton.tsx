"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/authFetch";

export default function RunMatchButton() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "running">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleRun() {
    setStatus("running");
    setMessage(null);
    try {
      const res = await authFetch("/matching/run", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.detail || `Failed (${res.status})`);
      }
      setMessage(
        `Matched ${body.matched_count} mentee${body.matched_count === 1 ? "" : "s"}, ${body.unmatched_mentee_count} left unmatched.`
      );
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleRun}
        disabled={status === "running"}
        className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
      >
        {status === "running" ? "Running match..." : "Run matching (admin)"}
      </button>
      {message && <p className="text-xs text-gray-600">{message}</p>}
    </div>
  );
}
