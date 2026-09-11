"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/authFetch";
import Badge from "@/components/ui/Badge";

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
      <summary className="focus-ring flex min-h-11 cursor-pointer items-center rounded-md text-sm font-medium text-ink">
        See full explanation
      </summary>
      <div className="mt-3 flex flex-col gap-3 text-sm text-ink">
        {(data.shared_words.length > 0 || data.shared_tags.length > 0) && (
          <ul className="flex flex-wrap gap-2" aria-label="Shared interests and background">
            {data.shared_words.slice(0, 5).map((w) => (
              <li key={w}>
                <Badge tone="accord">{w}</Badge>
              </li>
            ))}
            {data.shared_tags.map((t) => (
              <li key={t}>
                <Badge tone="mentor">{TAG_LABELS[t] ?? t}</Badge>
              </li>
            ))}
          </ul>
        )}
        <ul className="flex flex-wrap gap-2" aria-label="Ranking and capacity">
          {ownRank !== null && (
            <li>
              <Badge tone="neutral">You ranked them #{ownRank}</Badge>
            </li>
          )}
          {partnerRank !== null && (
            <li>
              <Badge tone="neutral">They ranked you #{partnerRank}</Badge>
            </li>
          )}
          <li>
            <Badge tone="neutral">
              {isMentee ? "Mentor" : "Your"} capacity {data.mentor_matched_count}/{data.mentor_capacity}
            </Badge>
          </li>
        </ul>
        <p className="border-t border-line pt-3 text-xs text-muted">
          Concord uses stable matching: everyone ranks who they&apos;d most want to work with, and
          the algorithm pairs people up so no two people would both rather be matched with each
          other than with who they ended up with. It&apos;s a rules-based algorithm, not AI -{" "}
          <a href="/how-it-works" className="focus-ring underline hover:text-ink">
            see exactly how it works
          </a>
          .
        </p>
      </div>
    </details>
  );
}
