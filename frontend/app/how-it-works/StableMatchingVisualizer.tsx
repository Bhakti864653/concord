"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Scene3DLayer from "@/components/scene3d/Scene3DLayer";
import { useConcordColors } from "@/components/scene3d/hooks/useConcordColors";
import { useReducedMotion } from "@/components/scene3d/hooks/useReducedMotion";
import { useWebGLSupport } from "@/components/scene3d/hooks/useWebGLSupport";
import type { ProjectedPoint } from "@/components/scene3d/ScreenProjector";
import { runGaleShapleySimRounds, type Round } from "@/lib/galeShapleySim";
import { bipartiteLayout } from "./bipartiteLayout";
import AlgorithmStaticFallback from "./AlgorithmStaticFallback";
import { buttonClasses } from "@/components/ui/Button";

const StableMatchingScene = dynamic(() => import("./StableMatchingScene"), { ssr: false });

const AUTO_ADVANCE_MS = 1900;

/**
 * The algorithm-transparency page's interactive deferred-acceptance
 * walkthrough: real start/pause/reset/advance controls in plain HTML,
 * driving both an accessible round-by-round text log and the matching
 * diagram (StableMatchingScene, or AlgorithmStaticFallback under reduced
 * motion/no WebGL) as one synchronized view. A real HTML name/capacity
 * label overlay sits on top either way - positioned by the live scene's
 * own screen projection when it's rendering, or by the same fixed layout
 * the fallback SVG uses when it isn't. Every value here comes from the
 * fictional MENTEES/MENTORS data Sandbox.tsx already defines - never real
 * user or match data.
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
  const reducedMotion = useReducedMotion();
  const webglSupported = useWebGLSupport();
  const canRender3D = !reducedMotion && webglSupported === true;

  const rounds = useMemo(
    () => runGaleShapleySimRounds(menteePrefs, mentorPrefs, capacity),
    [menteePrefs, mentorPrefs, capacity],
  );
  const [roundIndex, setRoundIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [projected, setProjected] = useState<ProjectedPoint[]>([]);

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

  const proposalsThisRound = useMemo(() => currentRound?.proposals ?? [], [currentRound]);
  const releasedPairs = useMemo(() => currentRound?.releases ?? [], [currentRound]);

  const fallbackRejectedPairs = useMemo(() => {
    const fromProposals = proposalsThisRound
      .filter((p) => p.outcome === "rejected")
      .map((p) => ({ mentee: p.mentee, mentor: p.mentor }));
    const fromReleases = releasedPairs.map((r) => ({ mentee: r.mentee, mentor: r.mentor }));
    return [...fromProposals, ...fromReleases];
  }, [proposalsThisRound, releasedPairs]);

  const activeIds = useMemo(() => {
    if (!currentRound) return new Set<string>();
    const ids = new Set<string>();
    for (const p of proposalsThisRound) {
      ids.add(p.mentee);
      ids.add(p.mentor);
    }
    for (const r of releasedPairs) {
      ids.add(r.mentee);
      ids.add(r.mentor);
    }
    return ids;
  }, [currentRound, proposalsThisRound, releasedPairs]);

  const unmatchedMentees = useMemo(() => {
    if (!isComplete) return [];
    const matchedIds = new Set(heldPairs.map((p) => p.mentee));
    return menteeIds.filter((id) => !matchedIds.has(id));
  }, [isComplete, heldPairs, menteeIds]);

  const onProjected = useCallback((points: ProjectedPoint[]) => setProjected(points), []);

  const overlayPositions = useMemo(() => {
    if (canRender3D && projected.length > 0) {
      return new Map(projected.map((p) => [p.id, { xPct: p.xPct, yPct: p.yPct }]));
    }
    const layout = bipartiteLayout(menteeIds, mentorIds);
    return new Map(layout.map((p) => [p.id, { xPct: p.xPct, yPct: p.yPct * 0.8 }]));
  }, [canRender3D, projected, menteeIds, mentorIds]);

  const capacityByMentor = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of heldPairs) counts[p.mentor] = (counts[p.mentor] ?? 0) + 1;
    return counts;
  }, [heldPairs]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-72 w-full rounded-2xl border border-line bg-paper sm:h-[26rem]">
        {/* overflow-hidden lives on this inner wrapper, not the outer box -
            a name/capacity label near the leftmost or rightmost column can
            need to extend a little past the diagram's own edge (especially
            at 390px widths), and clipping it there would cut off real
            accessible text rather than just an overflowing decorative
            visual. */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          <Scene3DLayer
            Scene={StableMatchingScene}
            sceneProps={{
              menteeIds,
              mentorIds,
              mentorCapacity: capacity,
              heldPairs,
              releasedPairs,
              proposalsThisRound,
              activeIds,
              isFinalRound: isComplete,
              roundKey: roundIndex,
              colors,
              onProjected,
            }}
            fallback={
              <AlgorithmStaticFallback
                menteeIds={menteeIds}
                mentorIds={mentorIds}
                mentorCapacity={capacity}
                heldPairs={heldPairs}
                rejectedPairs={fallbackRejectedPairs}
                className="h-full w-full"
              />
            }
            className="h-full w-full"
          />
        </div>

        {/* Real, accessible name + capacity labels, positioned over
            whichever visual (live scene or fallback) is currently showing -
            never inside the WebGL canvas or the fallback SVG itself. */}
        <div className="pointer-events-none absolute inset-0">
          {menteeIds.map((id) => {
            const pos = overlayPositions.get(id);
            if (!pos) return null;
            const dim = activeIds.size > 0 && !activeIds.has(id);
            return (
              <div
                key={id}
                className={`absolute -translate-x-1/2 -translate-y-1/2 text-center transition-opacity ${dim ? "opacity-40" : "opacity-100"}`}
                style={{ left: `${pos.xPct}%`, top: `${pos.yPct}%` }}
              >
                <span className="rounded-full bg-paper-raised/90 px-1.5 py-0.5 text-[11px] font-semibold text-mentee shadow-sm">
                  {id}
                </span>
              </div>
            );
          })}
          {mentorIds.map((id) => {
            const pos = overlayPositions.get(id);
            if (!pos) return null;
            const dim = activeIds.size > 0 && !activeIds.has(id);
            const total = capacity[id] ?? 0;
            const filled = capacityByMentor[id] ?? 0;
            return (
              <div
                key={id}
                className={`absolute -translate-x-1/2 -translate-y-1/2 text-center transition-opacity ${dim ? "opacity-40" : "opacity-100"}`}
                style={{ left: `${pos.xPct}%`, top: `${pos.yPct}%` }}
              >
                <span className="rounded-full bg-paper-raised/90 px-1.5 py-0.5 text-[11px] font-semibold text-mentor shadow-sm">
                  {id}
                </span>
                <span className="mt-0.5 block text-[10px] text-muted">
                  {filled}/{total} filled
                </span>
              </div>
            );
          })}
        </div>
      </div>

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
