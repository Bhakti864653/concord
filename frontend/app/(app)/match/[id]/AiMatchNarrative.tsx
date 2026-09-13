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

// Guards against a hung request outliving the component's own patience -
// independent of authFetch's own internal abort, which only wraps the
// fetch call itself and not the session lookup that happens before it.
const REQUEST_TIMEOUT_MS = 8000;

// Shown whenever the request fails, times out, or comes back with data
// that doesn't look like a real explanation - never a raw error, and
// never a skeleton that never resolves.
const GENERIC_FALLBACK: AiExplanation = {
  status: "failed",
  explanation:
    "You've been thoughtfully matched based on the goals and experience you each chose to share. This gives you a meaningful starting point for your first conversation.",
  is_fallback: true,
};

function isValidExplanation(body: unknown): body is AiExplanation {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    (b.status === "pending" || b.status === "ready" || b.status === "failed") &&
    typeof b.explanation === "string" &&
    b.explanation.length > 0
  );
}

/**
 * The AI-written "why you may work well together" narrative, layered
 * above the existing rules-based MatchExplanation - never replacing it.
 * Always renders something: a brief skeleton during the very first
 * fetch, then either the AI narrative or Concord's own deterministic
 * fallback (built server-side from the same shared interests/tags the
 * factual explanation already shows) if generation is still pending or
 * failed. A network/auth failure, a timeout, or an invalid response all
 * settle on a short generic Concord fallback rather than an error or a
 * skeleton that never resolves - this is a nice-to-have layer, never
 * something that can block or break the match page.
 */
export default function AiMatchNarrative({ matchId }: { matchId: string }) {
  const [data, setData] = useState<AiExplanation | null>(null);
  const attemptRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let pollTimeoutId: ReturnType<typeof setTimeout>;

    async function load() {
      let requestTimeoutId: ReturnType<typeof setTimeout> | undefined;
      try {
        const res = await Promise.race([
          authFetch(`/matches/${matchId}/ai-explanation`),
          new Promise<never>((_resolve, reject) => {
            requestTimeoutId = setTimeout(() => reject(new Error("timeout")), REQUEST_TIMEOUT_MS);
          }),
        ]);
        clearTimeout(requestTimeoutId);
        const body = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !isValidExplanation(body)) {
          setData((prev) => prev ?? GENERIC_FALLBACK);
          return;
        }
        setData(body);
        if (body.status === "pending" && attemptRef.current < POLL_DELAYS_MS.length) {
          const delay = POLL_DELAYS_MS[attemptRef.current];
          attemptRef.current += 1;
          pollTimeoutId = setTimeout(load, delay);
        }
      } catch {
        // Network/auth hiccup or timeout - show the generic fallback
        // instead of leaving the skeleton up forever, but don't clobber
        // anything already successfully rendered from an earlier poll.
        clearTimeout(requestTimeoutId);
        if (cancelled) return;
        setData((prev) => prev ?? GENERIC_FALLBACK);
      }
    }
    load();

    return () => {
      cancelled = true;
      clearTimeout(pollTimeoutId);
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
