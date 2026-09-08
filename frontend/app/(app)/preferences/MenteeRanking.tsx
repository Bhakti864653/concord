"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/authFetch";
import RankingList, { type RankingItem } from "./RankingList";

type Mentor = {
  user_id: string;
  mentors_in: string;
  bio: string;
  availability_count: number;
  score: number;
  match_reasons?: { shared_words: string[]; shared_tags: string[] };
};

export default function MenteeRanking({
  savedOrder,
  savedLocked,
}: {
  savedOrder: string[];
  savedLocked: boolean;
}) {
  const [items, setItems] = useState<RankingItem[] | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await authFetch("/matching/suggested-mentors");
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || `Failed (${res.status})`);
        }
        const body: { mentors: Mentor[] } = await res.json();
        const mapped: RankingItem[] = body.mentors.map((m) => ({
          id: m.user_id,
          title: m.mentors_in,
          subtitle: m.bio,
          extra: `Open to ${m.availability_count} mentee${m.availability_count === 1 ? "" : "s"}`,
          score: m.score,
          matchReasons: m.match_reasons
            ? { sharedWords: m.match_reasons.shared_words, sharedTags: m.match_reasons.shared_tags }
            : undefined,
        }));
        setItems(mapped);

        const allIds = mapped.map((m) => m.id);
        const idSet = new Set(allIds);
        // Previously-saved order first (dropping anyone no longer around),
        // then any new mentors that showed up since, by suggested score.
        const kept = savedOrder.filter((id) => idSet.has(id));
        const fresh = allIds.filter((id) => !kept.includes(id));
        setOrder(kept.length > 0 ? [...kept, ...fresh] : allIds);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave(orderedIds: string[], locked: boolean) {
    const res = await authFetch("/preferences/mentee", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ranked_ids: orderedIds, locked }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || `Failed (${res.status})`);
    }
  }

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!items) return <p className="text-sm text-muted">Loading...</p>;

  return (
    <RankingList
      items={items}
      initialOrder={order}
      initialLocked={savedLocked}
      onSave={handleSave}
      cardColor="mentor"
    />
  );
}
