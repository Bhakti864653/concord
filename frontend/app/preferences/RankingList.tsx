"use client";

import { useState } from "react";

export type RankingItem = {
  id: string;
  title: string;
  subtitle: string;
  extra?: string;
  score: number;
};

export default function RankingList({
  items,
  initialOrder,
  initialLocked,
  onSave,
}: {
  items: RankingItem[];
  initialOrder: string[];
  initialLocked: boolean;
  onSave: (orderedIds: string[], locked: boolean) => Promise<void>;
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
    return <p className="text-sm text-gray-500">No one to rank yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {locked && (
        <div className="flex items-center justify-between rounded border border-green-600 bg-green-50 px-3 py-2 text-sm">
          <span>Your preferences are locked in.</span>
          <button
            onClick={() => setLocked(false)}
            className="underline"
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
              className="flex items-start justify-between gap-3 rounded border p-3"
            >
              <div className="flex flex-col gap-1">
                <p className="text-xs text-gray-500">#{index + 1}</p>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-gray-700">{item.subtitle}</p>
                {item.extra && (
                  <p className="text-xs text-gray-500">{item.extra}</p>
                )}
                <p className="text-xs text-gray-400">
                  Match score: {Math.round(item.score * 100)}%
                </p>
              </div>
              {!locked && (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="rounded border px-2 py-1 text-xs disabled:opacity-30"
                  >
                    Up
                  </button>
                  <button
                    onClick={() => move(index, 1)}
                    disabled={index === order.length - 1}
                    className="rounded border px-2 py-1 text-xs disabled:opacity-30"
                  >
                    Down
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!locked && (
        <div className="flex gap-3">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="rounded border px-3 py-2 text-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save for later"}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Lock in my preferences"}
          </button>
        </div>
      )}
    </div>
  );
}
