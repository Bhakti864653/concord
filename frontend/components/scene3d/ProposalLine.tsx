"use client";

import { useMemo } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";

export type ProposalLineStyle = "held" | "rejected";

/**
 * A single curved connector between two node positions - the generic
 * building block the algorithm-transparency scene uses for proposal/hold/
 * reject lines (the landing/reveal scenes use ConvergingPaths instead,
 * which is specialized to exactly two paths converging on one point; this
 * is for an arbitrary mentee-mentor pair in a bipartite layout). Rejected
 * connections render dashed and faint, held ones solid and bright with the
 * same thin-core/wide-halo glow trick ConvergingPaths uses - so "rejected"
 * is never conveyed by color alone.
 */
export default function ProposalLine({
  from,
  to,
  color,
  style,
  opacity,
}: {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  style: ProposalLineStyle;
  /** Overrides the style's default opacity - used to fade a tentative hold vs. a final stable match. */
  opacity?: number;
}) {
  const points = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const mid = start.clone().lerp(end, 0.5);
    mid.z += 0.4;
    return new THREE.QuadraticBezierCurve3(start, mid, end).getPoints(20);
  }, [from, to]);

  const held = style === "held";
  const resolvedOpacity = opacity ?? (held ? 0.85 : 0.4);

  return (
    <>
      <Line
        points={points}
        color={color}
        lineWidth={held ? 2.5 : 1.5}
        transparent
        opacity={resolvedOpacity}
        dashed={!held}
        dashSize={0.08}
        gapSize={0.06}
      />
      {held && <Line points={points} color={color} lineWidth={5} transparent opacity={0.12} />}
    </>
  );
}
