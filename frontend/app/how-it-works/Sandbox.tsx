"use client";

import { useState } from "react";
import StableMatchingVisualizer from "./StableMatchingVisualizer";

const MENTEES = [
  { id: "Alex", tagline: "wants help with college essays" },
  { id: "Bao", tagline: "wants help choosing a major" },
  { id: "Chidi", tagline: "wants interview prep" },
];

const MENTORS = [
  { id: "Dana", tagline: "mentors in essay writing" },
  { id: "Ekene", tagline: "mentors in STEM majors" },
  { id: "Farah", tagline: "mentors in career advice" },
];

export default function Sandbox() {
  const [menteePrefs, setMenteePrefs] = useState<Record<string, string[]>>(
    Object.fromEntries(MENTEES.map((m) => [m.id, MENTORS.map((t) => t.id)])),
  );
  const [mentorPrefs, setMentorPrefs] = useState<Record<string, string[]>>(
    Object.fromEntries(MENTORS.map((t) => [t.id, MENTEES.map((m) => m.id)])),
  );
  const [capacity, setCapacity] = useState<Record<string, number>>(
    Object.fromEntries(MENTORS.map((t) => [t.id, 1])),
  );

  function move(
    setter: typeof setMenteePrefs,
    prefs: Record<string, string[]>,
    ownerId: string,
    index: number,
    direction: -1 | 1,
  ) {
    const list = prefs[ownerId];
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    setter({ ...prefs, [ownerId]: next });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-mentee">Mentee preferences</h3>
          {MENTEES.map((mentee) => (
            <div
              key={mentee.id}
              className="concord-lift rounded-xl border-l-4 border-mentee bg-paper-raised p-3"
            >
              <p className="text-sm font-medium text-ink">
                {mentee.id} <span className="font-normal text-muted">- {mentee.tagline}</span>
              </p>
              <ol className="mt-2 flex flex-col gap-1">
                {menteePrefs[mentee.id].map((mentorId, i) => (
                  <li key={mentorId} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-ink">
                      #{i + 1} {mentorId}
                    </span>
                    <span className="flex gap-1">
                      <button
                        onClick={() => move(setMenteePrefs, menteePrefs, mentee.id, i, -1)}
                        disabled={i === 0}
                        className="rounded border border-line px-1.5 text-xs text-ink disabled:opacity-30"
                      >
                        Up
                      </button>
                      <button
                        onClick={() => move(setMenteePrefs, menteePrefs, mentee.id, i, 1)}
                        disabled={i === menteePrefs[mentee.id].length - 1}
                        className="rounded border border-line px-1.5 text-xs text-ink disabled:opacity-30"
                      >
                        Down
                      </button>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-mentor">Mentor preferences & capacity</h3>
          {MENTORS.map((mentor) => (
            <div
              key={mentor.id}
              className="concord-lift rounded-xl border-l-4 border-mentor bg-paper-raised p-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-ink">
                  {mentor.id} <span className="font-normal text-muted">- {mentor.tagline}</span>
                </p>
                <label className="flex items-center gap-1 text-xs text-muted">
                  Capacity
                  <select
                    value={capacity[mentor.id]}
                    onChange={(e) =>
                      setCapacity({ ...capacity, [mentor.id]: Number(e.target.value) })
                    }
                    className="rounded border border-line bg-paper px-1 py-0.5 text-ink"
                  >
                    {[0, 1, 2, 3].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <ol className="mt-2 flex flex-col gap-1">
                {mentorPrefs[mentor.id].map((menteeId, i) => (
                  <li key={menteeId} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-ink">
                      #{i + 1} {menteeId}
                    </span>
                    <span className="flex gap-1">
                      <button
                        onClick={() => move(setMentorPrefs, mentorPrefs, mentor.id, i, -1)}
                        disabled={i === 0}
                        className="rounded border border-line px-1.5 text-xs text-ink disabled:opacity-30"
                      >
                        Up
                      </button>
                      <button
                        onClick={() => move(setMentorPrefs, mentorPrefs, mentor.id, i, 1)}
                        disabled={i === mentorPrefs[mentor.id].length - 1}
                        className="rounded border border-line px-1.5 text-xs text-ink disabled:opacity-30"
                      >
                        Down
                      </button>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>

      <StableMatchingVisualizer
        menteeIds={MENTEES.map((m) => m.id)}
        mentorIds={MENTORS.map((t) => t.id)}
        menteePrefs={menteePrefs}
        mentorPrefs={mentorPrefs}
        capacity={capacity}
      />
    </div>
  );
}
