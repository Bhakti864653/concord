"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Scene3DLayer from "@/components/scene3d/Scene3DLayer";
import { useConcordColors } from "@/components/scene3d/hooks/useConcordColors";
import { runGaleShapleySimRounds, type Round } from "@/lib/galeShapleySim";
import { buttonClasses } from "@/components/ui/Button";

const StableMatchingScene = dynamic(() => import("./StableMatchingScene"), { ssr: false });

const AUTO_ADVANCE_MS = 1700;

/**
 * The algorithm-transparency page's interactive deferred-acceptance
 * walkthrough: real start/pause/reset/advance controls in plain HTML,
 * driving both an accessible round-by-round text log and the 3D connection
 * diagram (StableMatchingScene) as one synchronized view. Every value here
 * comes from the fictional MENTEES/MENTORS data Sandbox.tsx already
 * defines - never real user or match data.
 */
export default function StableMatchingVisualizer({
  menteeIds,
  mentorIds,
  menteePrefs,
  mentorPrefs,
  capacity,
}: {
  menteeIds: string[];
  mentorIds: string[];
  menteePrefs: Record<string, string[]>;
  mentorPrefs: Record<string, string[]>;
  capacity: Record<string, number>;
}) {
  const colors = useConcordColors();
  const rounds = useMemo(
    () => runGaleShapleySimRounds(menteePrefs, mentorPrefs, capacity),
    [menteePrefs, mentorPrefs, capacity],
  );
  const [roundIndex, setRoundIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  // Editing a preference or capacity produces a new `rounds` array - restart
  // the walkthrough rather than pointing a stale round index at a
  // different simulation. Adjusting state during render (rather than in an
  // effect) when a prop/derived value changes is React's own documented
  // pattern for this - see https://react.dev/learn/you-might-not-need-an-effect.
  const [roundsForReset, setRoundsForReset] = useState(rounds);
  if (rounds !== roundsForReset) {
    setRoundsForReset(rounds);
    setRoundIndex(0);
    setPlaying(false);
  }

  const currentRound: Round | undefined = roundIndex > 0 ? rounds[roundIndex - 1] : undefined;
  const isComplete = rounds.length > 0 && roundIndex >= rounds.length;
  const isPlaying = playing && !isComplete;

  useEffect(() => {
    if (!isPlaying) return;
    const id = setTimeout(() => {
      setRoundIndex((i) => Math.min(rounds.length, i + 1));
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(id);
  }, [isPlaying, rounds.length]);

  function start() {
    if (isComplete) setRoundIndex(0);
    setPlaying(true);
  }

  function advanceOneRound() {
    setPlaying(false);
    setRoundIndex((i) => Math.min(rounds.length, i + 1));
  }

  function reset() {
    setPlaying(false);
    setRoundIndex(0);
  }

  const heldPairs = useMemo(() => {
    const held = currentRound?.mentorHeld ?? {};
    return Object.entries(held).flatMap(([mentor, mentees]) =>
      mentees.map((mentee) => ({ mentee, mentor })),
    );
  }, [currentRound]);

  const rejectedPairs = useMemo(() => {
    if (!currentRound) return [];
    const fromProposals = currentRound.proposals
      .filter((p) => p.outcome === "rejected")
      .map((p) => ({ mentee: p.mentee, mentor: p.mentor }));
    const fromReleases = currentRound.releases.map((r) => ({ mentee: r.mentee, mentor: r.mentor }));
    return [...fromProposals, ...fromReleases];
  }, [currentRound]);

  const unmatchedMentees = useMemo(() => {
    if (!isComplete) return [];
    const matchedIds = new Set(heldPairs.map((p) => p.mentee));
    return menteeIds.filter((id) => !matchedIds.has(id));
  }, [isComplete, heldPairs, menteeIds]);

  return (
    <div className="flex flex-col gap-4">
      <Scene3DLayer
        Scene={StableMatchingScene}
        sceneProps={{ menteeIds, mentorIds, heldPairs, rejectedPairs, isFinalRound: isComplete, colors }}
        fallbackVariant="algorithm"
        className="h-56 w-full overflow-hidden rounded-2xl border border-line bg-paper sm:h-64"
      />

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={start} disabled={isPlaying} className={buttonClasses("primary", "sm")}>
          Start
        </button>
        <button
          type="button"
          onClick={() => setPlaying(false)}
          disabled={!isPlaying}
          className={buttonClasses("secondary", "sm")}
        >
          Pause
        </button>
        <button
          type="button"
          onClick={advanceOneRound}
          disabled={isComplete}
          className={buttonClasses("secondary", "sm")}
        >
          Advance one round
        </button>
        <button type="button" onClick={reset} className={buttonClasses("secondary", "sm")}>
          Reset
        </button>
      </div>

      <div aria-live="polite" className="flex flex-col gap-2">
        <p className="text-sm font-medium text-ink">
          {roundIndex === 0 && "Not started - press Start or Advance one round."}
          {currentRound && !isComplete && `Round ${currentRound.index} of at least ${rounds.length}`}
          {isComplete && "Stable matching reached."}
        </p>

        {currentRound && (
          <ol className="flex flex-col gap-1 text-sm text-muted">
            {currentRound.logLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ol>
        )}

        {isComplete && (
          <div className="flex flex-col gap-3">
            <div>
              <h3 className="text-sm font-semibold text-ink">Final matches</h3>
              <div className="mt-1 flex flex-col gap-1">
                {heldPairs.map(({ mentee, mentor }) => (
                  <p key={mentee} className="text-sm text-ink">
                    {mentee} &rarr; {mentor}
                  </p>
                ))}
                {unmatchedMentees.map((mentee) => (
                  <p key={mentee} className="text-sm text-muted">
                    {mentee} &rarr; unmatched (waitlisted)
                  </p>
                ))}
              </div>
            </div>

            <div className="rounded-[var(--radius-card)] border-l-4 border-accord bg-accord-tint p-3 text-sm text-ink">
              <p className="font-medium text-accord">Why this is stable</p>
              <p className="mt-1">
                No mentee-mentor pair who aren&apos;t matched to each other would both prefer each other
                over what they actually ended up with (or over staying unmatched) - that&apos;s what
                &quot;stable&quot; means here.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
