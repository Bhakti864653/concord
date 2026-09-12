"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import MatchHeroStatic from "./MatchHeroStatic";
import { useReducedMotion } from "@/components/scene3d/hooks/useReducedMotion";
import { useWebGLSupport } from "@/components/scene3d/hooks/useWebGLSupport";
import type { MatchReasonChip } from "@/components/mentorship/MatchReasonChips";

const MatchRevealOverlay = dynamic(() => import("./MatchRevealOverlay"), { ssr: false });

const STORAGE_PREFIX = "concord-match-reveal-seen-";

/**
 * Decides, once per match per browser, whether this view gets the full
 * "convergence" entrance or the calm static hero. Renders MatchHeroStatic
 * first in every case (SSR-safe, zero flash for the overwhelming majority
 * of page loads - returning visits) and only swaps in the dramatic overlay
 * after confirming, client-side, that this match id has never been marked
 * seen in localStorage and the device can actually render it (motion
 * allowed, WebGL available). No database flag is used for "seen" - per-
 * match state here is intentionally just a local, per-browser marker, not
 * something that needs to sync across devices.
 */
export default function MatchHeroReveal({
  matchId,
  ownRole,
  ownTopic,
  counterpartRole,
  counterpartRoleLabel,
  counterpartTopic,
  reasonChips,
  isEnded,
}: {
  matchId: string;
  ownRole: "mentee" | "mentor";
  ownTopic: string;
  counterpartRole: "mentee" | "mentor";
  counterpartRoleLabel: string;
  counterpartTopic: string;
  reasonChips: MatchReasonChip[];
  isEnded: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const webglSupported = useWebGLSupport();
  const [showDrama, setShowDrama] = useState(false);
  const resolvedRef = useRef(false);

  useEffect(() => {
    if (resolvedRef.current || isEnded || webglSupported === null) return;
    resolvedRef.current = true;

    let seen = false;
    try {
      seen = localStorage.getItem(STORAGE_PREFIX + matchId) === "1";
    } catch {
      // Storage disabled/unavailable - fall back to always showing the
      // calm static hero rather than replaying the sequence every visit.
      seen = true;
    }

    if (!seen && !reducedMotion && webglSupported) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowDrama(true);
    } else if (!seen) {
      try {
        localStorage.setItem(STORAGE_PREFIX + matchId, "1");
      } catch {
        // Nothing to persist to - safe to no-op, this only controls replay.
      }
    }
  }, [matchId, isEnded, reducedMotion, webglSupported]);

  function finish() {
    try {
      localStorage.setItem(STORAGE_PREFIX + matchId, "1");
    } catch {
      // Same as above - the worst case is a replay next visit, not a break.
    }
    setShowDrama(false);
  }

  if (showDrama) {
    return (
      <MatchRevealOverlay
        ownRole={ownRole}
        ownTopic={ownTopic}
        counterpartRole={counterpartRole}
        counterpartTopic={counterpartTopic}
        counterpartRoleLabel={counterpartRoleLabel}
        reasonChips={reasonChips}
        onDone={finish}
      />
    );
  }

  return (
    <MatchHeroStatic
      ownRole={ownRole}
      ownTopic={ownTopic}
      counterpartRole={counterpartRole}
      counterpartTopic={counterpartTopic}
      reasonChips={reasonChips}
    />
  );
}
