"use client";

import { useState } from "react";
import { CIRCUMSTANCE_TAGS } from "@/lib/tags";
import Card from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";

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
  const [selectedId, setSelectedId] = useState(initialOrder[0]);

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
    return (
      <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
        No one to rank yet.
      </p>
    );
  }

  // Tailwind's compiler only picks up class names that appear literally in
  // source, so the mentee/mentor accent has to be full class strings per
  // branch here rather than a template-interpolated `bg-${color}` (which
  // would silently generate no CSS at all).
  const accent =
    cardColor === "mentee"
      ? {
          selectedRow: "border-mentee bg-mentee-tint",
          badgeSelected: "bg-mentee text-paper-raised",
          bar: "bg-mentee",
          calloutBg: "bg-mentee-tint",
          calloutText: "text-mentee",
        }
      : {
          selectedRow: "border-mentor bg-mentor-tint",
          badgeSelected: "bg-mentor text-paper-raised",
          bar: "bg-mentor",
          calloutBg: "bg-mentor-tint",
          calloutText: "text-mentor",
        };
  const selected = byId.get(selectedId) ?? byId.get(order[0]);

  return (
    <div className="flex flex-col gap-4">
      {locked && (
        <div className="flex items-center justify-between rounded-xl border border-accord bg-accord-tint px-4 py-2.5 text-sm text-ink">
          <span>Your preferences are locked in.</span>
          <button
            onClick={() => setLocked(false)}
            className="focus-ring rounded font-bold text-accord underline"
            disabled={saving}
          >
            Unlock to edit
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr] lg:items-start">
        <Card padding="sm" className="flex flex-col gap-2">
          <p className="px-1 text-xs font-bold text-muted">SUGGESTED ORDER</p>
          {order.map((id, index) => {
            const item = byId.get(id);
            if (!item) return null;
            const isSelected = id === selected?.id;
            return (
              <div
                key={id}
                className={`flex items-center gap-3 rounded-xl border p-2.5 transition-colors ${
                  isSelected ? accent.selectedRow : "border-transparent hover:bg-paper"
                }`}
              >
                <button
                  onClick={() => setSelectedId(id)}
                  className="focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                      isSelected ? accent.badgeSelected : "bg-paper text-muted"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {item.title}
                    </span>
                    <span className="block text-xs text-muted">
                      Match score: {Math.round(item.score * 100)}%
                    </span>
                  </span>
                </button>
                {!locked && (
                  <div className="flex shrink-0 flex-col gap-0.5">
                    <button
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      className="focus-ring rounded-[var(--radius-control)] border border-line px-1.5 py-0.5 text-[10px] font-bold text-ink disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => move(index, 1)}
                      disabled={index === order.length - 1}
                      className="focus-ring rounded-[var(--radius-control)] border border-line px-1.5 py-0.5 text-[10px] font-bold text-ink disabled:opacity-30"
                    >
                      ▼
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </Card>

        {selected && (
          <Card className="flex flex-col gap-4">
            <div className={`h-2 w-16 rounded-full ${accent.bar}`} />
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
                {selected.title}
              </h2>
              {selected.extra && (
                <p className="mt-1 text-sm text-muted">{selected.extra}</p>
              )}
            </div>

            {selected.matchReasons &&
              (selected.matchReasons.sharedWords.length > 0 ||
                selected.matchReasons.sharedTags.length > 0) && (
                <div className={`rounded-xl p-4 ${accent.calloutBg}`}>
                  <strong className={`block text-sm ${accent.calloutText}`}>
                    Why this could be a fit
                  </strong>
                  <p className="mt-1 text-sm text-ink">
                    You both mentioned{" "}
                    {selected.matchReasons.sharedWords.slice(0, 4).join(", ") || "similar things"}
                    {selected.matchReasons.sharedTags.length > 0 &&
                      ` and share ${selected.matchReasons.sharedTags
                        .map((t) => TAG_LABELS.get(t) ?? t)
                        .join(", ")}`}
                    .
                  </p>
                </div>
              )}

            <div>
              <p className="text-xs font-bold text-muted">ABOUT</p>
              <p className="mt-1 text-sm text-ink">{selected.subtitle}</p>
            </div>
          </Card>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {!locked && (
        <div className="flex gap-3">
          <button onClick={() => handleSave(false)} disabled={saving} className={buttonClasses("secondary")}>
            {saving ? "Saving..." : "Save for later"}
          </button>
          <button onClick={() => handleSave(true)} disabled={saving} className={buttonClasses("primary")}>
            {saving ? "Saving..." : "Lock in my preferences"}
          </button>
        </div>
      )}
    </div>
  );
}
