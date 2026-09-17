"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/authFetch";

// Shown whenever the request fails or comes back with data that doesn't
// look like a real explanation - never a raw error, and never a skeleton
// that never resolves.
const GENERIC_FALLBACK =
  "You've been thoughtfully matched based on the goals and experience you each chose to share. This gives you a meaningful starting point for your first conversation.";

function isValidExplanation(body: unknown): body is { explanation: string } {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return typeof b.explanation === "string" && b.explanation.length > 0;
}

/**
 * A short narrative built from the same shared interests/tags the
 * rules-based MatchExplanation already shows. Always renders something: a
 * brief skeleton during the fetch, then either the explanation or a
 * generic fallback if the request fails - this is a nice-to-have layer,
 * never something that can block or break the match page.
 */
export default function AiMatchNarrative({ matchId }: { matchId: string }) {
  const [explanation, setExplanation] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    authFetch(`/matches/${matchId}/ai-explanation`)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (cancelled) return;
        setExplanation(res.ok && isValidExplanation(body) ? body.explanation : GENERIC_FALLBACK);
      })
      .catch(() => {
        if (!cancelled) setExplanation(GENERIC_FALLBACK);
      });
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  return (
    <section className="concord-lift relative flex flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-paper-raised p-4">
      <h2 className="font-display text-sm font-semibold text-ink">
        Why you may work well together
      </h2>

      {explanation ? (
        <p className="text-sm text-ink">{explanation}</p>
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
