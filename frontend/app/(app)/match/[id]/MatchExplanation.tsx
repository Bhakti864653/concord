"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/authFetch";

type Explanation = {
  shared_words: string[];
  shared_tags: string[];
  mentee_rank_of_mentor: number | null;
  mentor_rank_of_mentee: number | null;
  mentor_capacity: number;
  mentor_matched_count: number;
};

const TAG_LABELS: Record<string, string> = {
  "first-gen": "first-gen",
  "career-switcher": "career-switcher",
  "immigrant-background": "immigrant background",
  "under-resourced-school-access": "under-resourced school access",
  other: "other",
};

export default function MatchExplanation({
  matchId,
  isMentee,
}: {
  matchId: string;
  isMentee: boolean;
}) {
  const [data, setData] = useState<Explanation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    authFetch(`/matches/${matchId}/explanation`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.detail || `Failed (${res.status})`);
        if (!cancelled) setData(body as Explanation);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Something went wrong.");
      });
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  if (error) return null; // non-essential - fail quietly rather than block the page
  if (!data) return null;

  const ownRank = isMentee ? data.mentee_rank_of_mentor : data.mentor_rank_of_mentee;
  const partnerRank = isMentee ? data.mentor_rank_of_mentee : data.mentee_rank_of_mentor;

  return (
    <details className="concord-lift group relative rounded-[var(--radius-card)] border border-line bg-paper-raised p-4">
      <summary className="focus-ring cursor-pointer rounded-md text-sm font-medium text-ink">
        Why this match?
      </summary>
      <div className="mt-3 flex flex-col gap-2 text-sm text-ink">
        {(data.shared_words.length > 0 || data.shared_tags.length > 0) && (
          <p>
            You both mentioned{" "}
            {data.shared_words.length > 0 ? data.shared_words.slice(0, 5).join(", ") : "similar things"}
            {data.shared_tags.length > 0 &&
              ` and share ${data.shared_tags.map((t) => TAG_LABELS[t] ?? t).join(", ")}`}
            .
          </p>
        )}
        {ownRank !== null && (
          <p>
            You ranked them #{ownRank} on your preference list
            {partnerRank !== null && `, and they ranked you #${partnerRank} on theirs`}.
          </p>
        )}
        <p>
          {isMentee
            ? `Your mentor had capacity for ${data.mentor_capacity} mentee${data.mentor_capacity === 1 ? "" : "s"} and is currently matched with ${data.mentor_matched_count}.`
            : `You had capacity for ${data.mentor_capacity} mentee${data.mentor_capacity === 1 ? "" : "s"} and are currently matched with ${data.mentor_matched_count}.`}
        </p>
      </div>
    </details>
  );
}
