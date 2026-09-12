"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Scene3DLayer from "@/components/scene3d/Scene3DLayer";
import { useConcordColors } from "@/components/scene3d/hooks/useConcordColors";
import { useReducedMotion } from "@/components/scene3d/hooks/useReducedMotion";
import InitialAvatar from "@/components/mentorship/InitialAvatar";
import MatchReasonChips, { type MatchReasonChip } from "@/components/mentorship/MatchReasonChips";
import MatchStaticFallback from "./MatchStaticFallback";
import { buttonClasses } from "@/components/ui/Button";

const MatchRevealScene = dynamic(() => import("./MatchRevealScene"), { ssr: false });

const SEQUENCE_MS = 5600;

/**
 * "The convergence" - the cinematic four-stage match-reveal sequence.
 * Mounted by MatchHeroReveal.tsx either automatically (a genuinely
 * first-time view) or on demand (the static header's "Replay reveal"
 * control) - either way this is the same component, so replay looks
 * exactly like the original moment. A single 0..1 timeline (`t`) drives
 * the 3D convergence and every HTML stage together, so nothing can drift
 * out of sync. Respects reduced motion by presenting the finished state
 * immediately instead of animating - relevant only for a manual replay,
 * since the automatic first-view trigger already never fires under
 * reduced motion (see MatchHeroReveal.tsx).
 */
export default function MatchRevealOverlay({
  ownRole,
  ownTopic,
  counterpartRole,
  counterpartTopic,
  counterpartRoleLabel,
  reasonChips,
  onDone,
}: {
  ownRole: "mentee" | "mentor";
  ownTopic: string;
  counterpartRole: "mentee" | "mentor";
  counterpartTopic: string;
  counterpartRoleLabel: string;
  reasonChips: MatchReasonChip[];
  onDone: () => void;
}) {
  const colors = useConcordColors();
  const reducedMotion = useReducedMotion();
  const [t, setT] = useState(reducedMotion ? 1 : 0);
  const doneRef = useRef(false);

  useEffect(() => {
    if (reducedMotion) {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone();
      }
      return;
    }

    let raf = 0;
    let start: number | null = null;

    function tick(ts: number) {
      if (start === null) start = ts;
      const next = Math.min(1, (ts - start) / SEQUENCE_MS);
      setT(next);
      if (next < 1) {
        raf = requestAnimationFrame(tick);
      } else if (!doneRef.current) {
        doneRef.current = true;
        onDone();
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone, reducedMotion]);

  function skip() {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }

  // Stage timeline over the single 0..1 timeline `t`.
  const arrivalEase = Math.min(1, t / 0.15);
  const discoveryStart = 0.22;
  const discoveryStep = 0.1;
  const convergenceStart = 0.48;
  const convergenceEnd = 0.85;
  const pathProgress = Math.max(0, Math.min(1, (t - convergenceStart) / (convergenceEnd - convergenceStart)));
  const headingVisible = t > 0.86;
  const chipsRecapVisible = t > 0.92;

  return (
    <section
      aria-label="Match reveal"
      className="concord-lift relative flex min-h-[26rem] w-full flex-col items-center justify-center overflow-hidden rounded-[28px] px-4 py-10 sm:min-h-[60vh] sm:px-10 lg:min-h-[68vh]"
    >
      <div aria-hidden="true" className="concord-glow absolute inset-0" style={{ opacity: 0.5 }} />

      <button
        type="button"
        onClick={skip}
        className={buttonClasses("secondary", "sm", "absolute right-4 top-4 z-20")}
      >
        Skip reveal
      </button>

      <Scene3DLayer
        Scene={MatchRevealScene}
        sceneProps={{ progress: pathProgress, pushIn: pathProgress, colors }}
        fallback={<MatchStaticFallback compatibilityCount={reasonChips.length || 1} className="h-full w-full" />}
        className="pointer-events-none absolute inset-0"
      />

      <div className="relative flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-8">
        <div className="flex w-full items-start justify-between gap-4">
          <div
            className="flex flex-col items-center gap-2 text-center"
            style={{
              opacity: arrivalEase,
              transform: `translateX(${(1 - arrivalEase) * -28}px)`,
              transition: "opacity 0.8s ease-out, transform 0.8s ease-out",
            }}
          >
            <InitialAvatar label={ownTopic} role={ownRole} size="lg" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Your journey</p>
            <p className="font-display text-sm font-semibold text-ink">{ownTopic}</p>
          </div>

          <div
            className="flex flex-col items-center gap-2 text-center"
            style={{
              opacity: arrivalEase,
              transform: `translateX(${(1 - arrivalEase) * 28}px)`,
              transition: "opacity 0.8s ease-out, transform 0.8s ease-out",
            }}
          >
            <InitialAvatar label={counterpartTopic} role={counterpartRole} size="lg" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Their journey</p>
            <p className="font-display text-sm font-semibold text-ink">{counterpartTopic}</p>
          </div>
        </div>

        {reasonChips.length > 0 && (
          <div className="relative flex w-full max-w-md items-center justify-center gap-3">
            <div aria-hidden="true" className="absolute inset-x-6 top-1/2 h-px bg-line" />
            {reasonChips.map((chip, i) => {
              const visible = t > discoveryStart + i * discoveryStep;
              return (
                <div
                  key={chip.label}
                  className="relative"
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? "translateY(0) scale(1)" : "translateY(6px) scale(0.85)",
                    transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
                  }}
                >
                  <MatchReasonChips reasons={[chip]} />
                </div>
              );
            })}
          </div>
        )}

        <div
          className="flex flex-col items-center gap-2 text-center"
          style={{ opacity: headingVisible ? 1 : 0, transition: "opacity 0.6s ease-out" }}
        >
          <span
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-accord text-paper"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M5 12l4 4L19 6" />
            </svg>
          </span>
          <h1 className="font-display text-xl font-semibold tracking-tight text-ink">
            You&apos;ve been thoughtfully matched
          </h1>
        </div>

        <div
          className="flex flex-col items-center gap-2 text-center"
          style={{ opacity: chipsRecapVisible ? 1 : 0, transition: "opacity 0.5s ease-out" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {counterpartRoleLabel}
          </p>
          <p className="font-display text-base font-semibold text-ink">{counterpartTopic}</p>
        </div>
      </div>
    </section>
  );
}
