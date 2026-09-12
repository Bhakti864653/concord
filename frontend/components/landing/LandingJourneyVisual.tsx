"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Scene3DLayer from "@/components/scene3d/Scene3DLayer";
import { useConcordColors } from "@/components/scene3d/hooks/useConcordColors";
import LandingStaticFallback from "./LandingStaticFallback";

const LandingJourneyScene = dynamic(() => import("./LandingJourneyScene"), { ssr: false });

const ENTRANCE_MS = 2000;
const ENTRANCE_TARGET = 0.62;
const SCROLL_MAX_PX = 480;
const SCROLL_NUDGE = 0.4;

/**
 * Drives the hero scene's `progress` (0 = paths fully separate, 1 = fully
 * converged): a noticeable ~2s one-time ease-out entrance on mount up to
 * ~0.62, then scroll nudges it the rest of the way as the visitor scrolls
 * past the hero. The entrance rAF loop stops itself once it finishes;
 * scroll updates are event-driven and rAF-throttled, not a perpetual loop.
 * Ambient life after the entrance (traveling nodes, the core's slow tumble)
 * comes from ConvergingPaths/ConcordCore's own useFrame animations, which
 * keep running independent of this progress value - not from anything
 * driven here.
 */
export default function LandingJourneyVisual() {
  const colors = useConcordColors();
  const [progress, setProgress] = useState(0);
  const scrollNudgeRef = useRef(0);
  const entranceEasedRef = useRef(0);

  useEffect(() => {
    let entranceRaf = 0;
    let scrollRaf = 0;
    let start: number | null = null;

    function commit() {
      setProgress(Math.min(1, entranceEasedRef.current * ENTRANCE_TARGET + scrollNudgeRef.current));
    }

    function tickEntrance(ts: number) {
      if (start === null) start = ts;
      const t = Math.min(1, (ts - start) / ENTRANCE_MS);
      entranceEasedRef.current = 1 - Math.pow(1 - t, 3);
      commit();
      if (t < 1) entranceRaf = requestAnimationFrame(tickEntrance);
    }
    entranceRaf = requestAnimationFrame(tickEntrance);

    function onScroll() {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollNudgeRef.current = Math.min(1, window.scrollY / SCROLL_MAX_PX) * SCROLL_NUDGE;
        commit();
        scrollRaf = 0;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(entranceRaf);
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <Scene3DLayer
      Scene={LandingJourneyScene}
      sceneProps={{ progress, colors }}
      fallback={<LandingStaticFallback className="h-full w-full" />}
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    />
  );
}
