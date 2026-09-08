"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AVAILABILITY_DAYS, AVAILABILITY_TIMES_OF_DAY } from "@/lib/availabilitySlots";

export default function AvailabilityPicker({
  userId,
  initialSlots,
  partnerSlots,
}: {
  userId: string;
  initialSlots: string[];
  partnerSlots: string[];
}) {
  const [supabase] = useState(() => createClient());
  const [slots, setSlots] = useState<string[]>(initialSlots);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const partnerSet = new Set(partnerSlots);

  function toggle(slot: string) {
    setSaved(false);
    setSlots((prev) => (prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("availability")
      .upsert({ user_id: userId, slots, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSaved(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="p-2"></th>
              {AVAILABILITY_TIMES_OF_DAY.map((t) => (
                <th key={t.value} className="p-2 text-left text-xs font-medium text-muted">
                  {t.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AVAILABILITY_DAYS.map((day) => (
              <tr key={day.value}>
                <td className="p-1 pr-2 text-sm font-medium text-ink">{day.label}</td>
                {AVAILABILITY_TIMES_OF_DAY.map((time) => {
                  const slot = `${day.value}-${time.value}`;
                  const mine = slots.includes(slot);
                  const overlap = mine && partnerSet.has(slot);
                  return (
                    <td key={slot} className="p-1">
                      <button
                        type="button"
                        onClick={() => toggle(slot)}
                        className={`w-full rounded-md border px-2 py-1.5 text-xs transition-colors ${
                          overlap
                            ? "border-accord bg-accord-tint font-medium text-ink"
                            : mine
                              ? "border-ink bg-ink text-paper"
                              : "border-line text-muted hover:border-ink"
                        }`}
                      >
                        {overlap ? "Both free" : mine ? "You're free" : "Mark free"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="self-start rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save availability"}
        </button>
        {saved && <p className="text-xs text-muted">Saved.</p>}
      </div>

      <p className="text-xs text-muted">
        Cells marked <span className="font-medium text-ink">Both free</span> are times you&apos;ve
        both marked as available.
      </p>
    </div>
  );
}
