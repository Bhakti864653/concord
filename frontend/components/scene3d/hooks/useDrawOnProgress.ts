"use client";

import { useEffect, useState } from "react";

/**
 * Animates 0 -> 1 over `durationMs` every time `trigger` changes (e.g. a
 * round index, or a stage name) - drives "this line/ribbon is drawing
 * across space right now" effects without a custom shader: a caller feeds
 * the returned progress into how many of a curve's points it renders, or
 * into an opacity/scale ramp. Starts at 1 (nothing pending) until the first
 * real trigger change, so a scene with nothing to show yet doesn't animate
 * from a "drawn" state it never had.
 *
 * Resetting progress when `trigger` changes happens during render (React's
 * own documented pattern for this - see
 * https://react.dev/learn/you-might-not-need-an-effect) rather than in an
 * effect, so only the actual rAF loop needs an effect at all.
 */
export function useDrawOnProgress(trigger: unknown, durationMs = 600): number {
  const [progress, setProgress] = useState(1);
  const [seenTrigger, setSeenTrigger] = useState(trigger);
  const [generation, setGeneration] = useState(0);

  if (trigger !== seenTrigger) {
    setSeenTrigger(trigger);
    setProgress(0);
    setGeneration((g) => g + 1);
  }

  useEffect(() => {
    if (generation === 0) return;
    let raf = 0;
    let start: number | null = null;

    function tick(ts: number) {
      if (start === null) start = ts;
      const t = Math.min(1, (ts - start) / durationMs);
      setProgress(t);
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // generation is the only thing that should restart this loop - durationMs
    // changing mid-flight isn't a real use case this needs to handle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generation]);

  return progress;
}
