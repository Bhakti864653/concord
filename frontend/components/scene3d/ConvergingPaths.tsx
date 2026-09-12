"use client";

import { useMemo } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import ConnectionNode from "./ConnectionNode";

export type ConvergingPathsProps = {
  /** 0 = the two paths are fully separate, 1 = fully converged. Caller-driven. */
  progress: number;
  menteeColor: string;
  mentorColor: string;
  accordColor: string;
  spread?: number;
  endPoint?: [number, number, number];
  nodesPerPath?: number;
  compact?: boolean;
};

function buildCurve(
  fromSide: "left" | "right",
  spread: number,
  end: THREE.Vector3,
  progress: number,
): THREE.CatmullRomCurve3 {
  const sign = fromSide === "left" ? -1 : 1;
  const separateStart = new THREE.Vector3(sign * spread, sign * 0.9, -1.4);
  const separateMid = new THREE.Vector3(sign * spread * 0.45, sign * 0.3, -0.5);
  const convergedStart = new THREE.Vector3(sign * spread * 0.35, sign * 0.35, -0.6);
  const convergedMid = new THREE.Vector3(sign * spread * 0.12, sign * 0.08, -0.15);

  const start = separateStart.clone().lerp(convergedStart, progress);
  const mid = separateMid.clone().lerp(convergedMid, progress);

  return new THREE.CatmullRomCurve3([start, mid, end.clone()]);
}

/**
 * The one shared "two journeys converging" primitive behind all three
 * experiences: an elegant curved mentee path and mentor path, gradually
 * pulled together by `progress`, each carrying a few small glowing
 * "compatibility" nodes that light up once the paths are mostly joined.
 * Callers (LandingJourneyScene, MatchRevealScene, StableMatchingScene)
 * drive `progress` and position/scale this via a wrapping <group> - this
 * component owns the curve math and rendering, nothing business-specific.
 */
export default function ConvergingPaths({
  progress,
  menteeColor,
  mentorColor,
  accordColor,
  spread = 2.6,
  endPoint = [0, -0.15, 0.2],
  nodesPerPath = 3,
  compact = false,
}: ConvergingPathsProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  // Quantizing avoids rebuilding curve geometry on every sub-pixel scroll
  // delta - 100 steps is far smoother than the eye can tell apart across a
  // 1-2s entrance or a full-page scroll range.
  const quantized = Math.round(clamped * 100) / 100;
  const end = useMemo(
    () => new THREE.Vector3(endPoint[0], endPoint[1], endPoint[2]),
    [endPoint],
  );

  const menteeCurve = useMemo(
    () => buildCurve("left", spread, end, quantized),
    [spread, end, quantized],
  );
  const mentorCurve = useMemo(
    () => buildCurve("right", spread, end, quantized),
    [spread, end, quantized],
  );

  const segments = compact ? 24 : 40;
  const menteePoints = useMemo(() => menteeCurve.getPoints(segments), [menteeCurve, segments]);
  const mentorPoints = useMemo(() => mentorCurve.getPoints(segments), [mentorCurve, segments]);

  const nodeFractions = useMemo(
    () => Array.from({ length: nodesPerPath }, (_, i) => (i + 1) / (nodesPerPath + 1)),
    [nodesPerPath],
  );

  const pulseThreshold = 0.72;

  return (
    <group>
      {/* A thin bright core line plus a wider, very transparent duplicate
          stands in for a glow without a postprocessing bloom pass. */}
      <Line points={menteePoints} color={menteeColor} lineWidth={2} transparent opacity={0.8} />
      <Line points={menteePoints} color={menteeColor} lineWidth={5} transparent opacity={0.12} />
      <Line points={mentorPoints} color={mentorColor} lineWidth={2} transparent opacity={0.8} />
      <Line points={mentorPoints} color={mentorColor} lineWidth={5} transparent opacity={0.12} />

      {nodeFractions.map((t, i) => {
        const p = menteeCurve.getPointAt(t);
        return (
          <ConnectionNode
            key={`mentee-${i}`}
            position={[p.x, p.y, p.z]}
            color={menteeColor}
            pulse={quantized > pulseThreshold && t > 0.5}
          />
        );
      })}
      {nodeFractions.map((t, i) => {
        const p = mentorCurve.getPointAt(t);
        return (
          <ConnectionNode
            key={`mentor-${i}`}
            position={[p.x, p.y, p.z]}
            color={mentorColor}
            pulse={quantized > pulseThreshold && t > 0.5}
          />
        );
      })}

      {quantized > 0.85 && (
        <ConnectionNode position={endPoint} color={accordColor} size={0.12} pulse />
      )}
    </group>
  );
}
