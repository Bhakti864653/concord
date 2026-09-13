"use client";

import { useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/authFetch";

type AiExplanation = {
  status: "pending" | "ready" | "failed";
  explanation: string;
  is_fallback: boolean;
};

// A short handful of retries while the backend's background generation is
// still running, then settle on whatever came back (AI text or Concord's
// own deterministic fallback) - never polls indefinitely.
const POLL_DELAYS_MS = [2000, 4000, 6000];

/**
 * The AI-written "why you may work well together" narrative, layered
 * above the existing rules-based MatchExplanation - never replacing it.
 * Always renders something: a brief skeleton during the very first
 * fetch, then either the AI narrative or Concord's own deterministic
 * fallback (built server-side from the same shared interests/tags the
 * factual explanation already shows) if generation is still pending or
 * failed. Fails quietly on a network error, same philosophy as
 * MatchExplanation.tsx - this is a nice-to-have layer, never something
 * that can block or break the match page.
 */
export default function AiMatchNarrative({ matchId }: { matchId: string }) {
  const [data, setData] = useState<AiExplanation | null>(null);
  const attemptRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function load() {
      try {
        const res = await authFetch(`/matches/${matchId}/ai-explanation`);
        const body = await res.json().catch(() => null);
        if (!res.ok || !body) throw new Error("bad response");
        if (cancelled) return;
        setData(body as AiExplanation);
        if (body.status === "pending" && attemptRef.current < POLL_DELAYS_MS.length) {
          const delay = POLL_DELAYS_MS[attemptRef.current];
          attemptRef.current += 1;
          timeoutId = setTimeout(load, delay);
        }
      } catch {
        // Network/auth hiccup - leave whatever was last rendered (or
        // nothing, on the very first attempt) rather than showing an error.
      }
    }
    load();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [matchId]);

  return (
    <section className="concord-lift relative flex flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-paper-raised p-4">
      <h2 className="font-display text-sm font-semibold text-ink">
        Why you may work well together
      </h2>

      {data ? (
        <p className="text-sm text-ink">{data.explanation}</p>
      ) : (
        <div aria-hidden="true" className="flex flex-col gap-2">
          <div className="h-3.5 w-11/12 animate-pulse rounded bg-line" />
          <div className="h-3.5 w-3/4 animate-pulse rounded bg-line" />
        </div>
      )}

      <p className="border-t border-line pt-2 text-xs text-muted">
        Written from the profile details you chose to share. Your match itself was created by
        Concord&apos;s stable-matching algorithm.
      </p>
    </section>
  );
}
