"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Scene3DLayer from "@/components/scene3d/Scene3DLayer";
import { useConcordColors } from "@/components/scene3d/hooks/useConcordColors";
import InitialAvatar from "@/components/mentorship/InitialAvatar";
import MatchReasonChips, { type MatchReasonChip } from "@/components/mentorship/MatchReasonChips";
import { buttonClasses } from "@/components/ui/Button";

const MatchRevealScene = dynamic(() => import("./MatchRevealScene"), { ssr: false });

const SEQUENCE_MS = 3400;

/**
 * "The convergence" - the one-time dramatic match-reveal sequence. Only
 * ever mounted by MatchHeroReveal.tsx for a genuinely first-time,
 * motion-and-WebGL-capable view of a match; every other case (returning
 * visitor, reduced motion, no WebGL) goes straight to MatchHeroStatic and
 * never reaches this component. A single 0..1 timeline (`t`) drives both
 * the 3D convergence and the HTML identity/heading/chip reveals together,
 * so the two layers stay in sync without separate timers.
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
  const [t, setT] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
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
  }, [onDone]);

  function skip() {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }

  const orbEase = Math.min(1, t / 0.18);
  const pathProgress = Math.max(0, Math.min(1, (t - 0.12) / 0.5));
  const chipsVisible = t > 0.55;
  const headingVisible = t > 0.68;

  return (
    <section
      aria-label="Match reveal"
      className="concord-lift relative flex flex-col items-center gap-5 overflow-hidden rounded-[28px] bg-paper-raised px-5 py-7 sm:px-8"
    >
      <button
        type="button"
        onClick={skip}
        className={buttonClasses("secondary", "sm", "absolute right-4 top-4 z-10")}
      >
        Skip animation
      </button>

      <Scene3DLayer
        Scene={MatchRevealScene}
        sceneProps={{ progress: pathProgress, colors }}
        fallbackVariant="reveal"
        className="pointer-events-none absolute inset-0"
      />

      <div className="relative flex w-full flex-col items-center gap-4 pt-8 lg:flex-row lg:justify-between lg:gap-8">
        <div
          className="flex flex-col items-center gap-2 text-center lg:flex-row lg:text-left"
          style={{
            opacity: orbEase,
            transform: `translateX(${(1 - orbEase) * -24}px)`,
            transition: "opacity 0.7s ease-out, transform 0.7s ease-out",
          }}
        >
          <InitialAvatar label={ownTopic} role={ownRole} size="lg" />
          <div className="flex flex-col">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">You</p>
            <p className="font-display text-base font-semibold text-ink">{ownTopic}</p>
          </div>
        </div>

        <div
          className="flex flex-col items-center gap-2 text-center lg:flex-row-reverse lg:text-right"
          style={{
            opacity: orbEase,
            transform: `translateX(${(1 - orbEase) * 24}px)`,
            transition: "opacity 0.7s ease-out, transform 0.7s ease-out",
          }}
        >
          <InitialAvatar label={counterpartTopic} role={counterpartRole} size="lg" />
          <div className="flex flex-col">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {counterpartRoleLabel}
            </p>
            <p className="font-display text-base font-semibold text-ink">{counterpartTopic}</p>
          </div>
        </div>
      </div>

      <div
        className="relative flex items-center gap-2"
        style={{ opacity: headingVisible ? 1 : 0, transition: "opacity 0.5s ease-out" }}
      >
        <span
          aria-hidden="true"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-accord text-paper"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M5 12l4 4L19 6" />
          </svg>
        </span>
        <h1 className="font-display text-lg font-semibold tracking-tight text-ink">
          You&apos;ve been matched!
        </h1>
      </div>

      <div
        className="relative"
        style={{ opacity: chipsVisible ? 1 : 0, transition: "opacity 0.5s ease-out" }}
      >
        <MatchReasonChips reasons={reasonChips} />
      </div>
    </section>
  );
}
