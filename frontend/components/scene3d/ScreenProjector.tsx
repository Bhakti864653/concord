"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export type ProjectedPoint = { id: string; xPct: number; yPct: number };

/**
 * Bridges 3D node positions to 2D screen percentages so a sibling HTML
 * overlay (names, capacity, status - anything that needs to be real,
 * accessible text rather than WebGL-drawn) can stay pinned to where a node
 * actually renders on screen. Lives inside the R3F tree (needs
 * useThree/useFrame); reports up via `onUpdate` only when the projected
 * result actually changes, since the camera and node layout here are both
 * static within a round - this fires once after mount/resize/round change,
 * not every frame. Renders nothing itself.
 */
export default function ScreenProjector({
  points,
  onUpdate,
}: {
  points: { id: string; position: [number, number, number] }[];
  onUpdate: (result: ProjectedPoint[]) => void;
}) {
  const { camera } = useThree();
  const lastKeyRef = useRef<string>("");
  const vecRef = useRef(new THREE.Vector3());

  useFrame(() => {
    const result: ProjectedPoint[] = points.map(({ id, position }) => {
      vecRef.current.set(position[0], position[1], position[2]);
      vecRef.current.project(camera);
      return {
        id,
        xPct: (vecRef.current.x * 0.5 + 0.5) * 100,
        yPct: (1 - (vecRef.current.y * 0.5 + 0.5)) * 100,
      };
    });
    const key = result.map((r) => `${r.id}:${r.xPct.toFixed(2)}:${r.yPct.toFixed(2)}`).join("|");
    if (key !== lastKeyRef.current) {
      lastKeyRef.current = key;
      onUpdate(result);
    }
  });

  return null;
}
