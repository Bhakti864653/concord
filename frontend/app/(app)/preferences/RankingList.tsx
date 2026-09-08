"use client";

import { useState } from "react";
import { CIRCUMSTANCE_TAGS } from "@/lib/tags";

export type RankingItem = {
  id: string;
  title: string;
  subtitle: string;
  extra?: string;
  score: number;
  matchReasons?: { sharedWords: string[]; sharedTags: string[] };
};

const TAG_LABELS = new Map(CIRCUMSTANCE_TAGS.map((t) => [t.value, t.label]));

export default function RankingList({
  items,
  initialOrder,
  initialLocked,
  onSave,
  cardColor,
}: {
  items: RankingItem[];
  initialOrder: string[];
  initialLocked: boolean;
  onSave: (orderedIds: string[], locked: boolean) => Promise<void>;
  /** The color of the side being ranked here (mentors on the mentee
   * ranking page, mentees on the mentor ranking page) - matches the
   * convention on the dashboard's browse cards. */
  cardColor: "mentee" | "mentor";
}) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const [order, setOrder] = useState(initialOrder);
  const [locked, setLocked] = useState(initialLocked);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  }

  async function handleSave(lock: boolean) {
    setSaving(true);
    setError(null);
    try {
      await onSave(order, lock);
      setLocked(lock);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted">No one to rank yet.</p>;
  }

  const cardBorderClass = cardColor === "mentee" ? "border-mentee" : "border-mentor";

  return (
    <div className="flex flex-col gap-4">
      {locked && (
        <div className="flex items-center justify-between rounded-lg border border-accord bg-accord-tint px-3 py-2 text-sm text-ink">
          <span>Your preferences are locked in.</span>
          <button
            onClick={() => setLocked(false)}
            className="font-medium underline"
            disabled={saving}
          >
            Unlock to edit
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {order.map((id, index) => {
          const item = byId.get(id);
          if (!item) return null;
          return (
            <div
              key={id}
              className={`flex items-start justify-between gap-3 rounded-lg border-l-4 bg-paper-raised p-3 ${cardBorderClass}`}
            >
              <div className="flex flex-col gap-1">
                <p className="text-xs text-muted">#{index + 1}</p>
                <p className="font-medium text-ink">{item.title}</p>
                <p className="text-sm text-muted">{item.subtitle}</p>
                {item.extra && <p className="text-xs text-muted">{item.extra}</p>}
                <p className="text-xs font-medium text-accord">
                  Match score: {Math.round(item.score * 100)}%
                </p>
                {item.matchReasons &&
                  (item.matchReasons.sharedWords.length > 0 ||
                    item.matchReasons.sharedTags.length > 0) && (
                    <p className="text-xs text-muted">
                      Matched because you both mentioned{" "}
                      {item.matchReasons.sharedWords.slice(0, 4).join(", ") || "similar things"}
                      {item.matchReasons.sharedTags.length > 0 &&
                        ` and share ${item.matchReasons.sharedTags
                          .map((t) => TAG_LABELS.get(t) ?? t)
                          .join(", ")}`}
                    </p>
                  )}
              </div>
              {!locked && (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="rounded-md border border-line px-2 py-1 text-xs text-ink disabled:opacity-30"
                  >
                    Up
                  </button>
                  <button
                    onClick={() => move(index, 1)}
                    disabled={index === order.length - 1}
                    className="rounded-md border border-line px-2 py-1 text-xs text-ink disabled:opacity-30"
                  >
                    Down
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {!locked && (
        <div className="flex gap-3">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save for later"}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="rounded-md bg-ink px-3 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Lock in my preferences"}
          </button>
        </div>
      )}
    </div>
  );
}
