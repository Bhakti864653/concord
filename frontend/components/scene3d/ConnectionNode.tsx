"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * A single small "compatibility node" - a bright core plus a soft, larger,
 * low-opacity halo standing in for glow. Layered transparent spheres
 * instead of a bloom post-processing pass or a texture, deliberately: it's
 * a handful of extra cheap triangles, not a full-screen render pass, and it
 * reads as "restrained glow" rather than a hard-edged dot.
 */
export default function ConnectionNode({
  position,
  color,
  size = 0.09,
  pulse = false,
}: {
  position: [number, number, number];
  color: string;
  size?: number;
  pulse?: boolean;
}) {
  const haloRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  // A deterministic per-node stagger derived from its own position (not
  // Math.random, which render must stay pure of) - different nodes just
  // need to look unsynchronized, not truly random.
  const phase = useMemo(
    () => ((position[0] * 12.9898 + position[1] * 78.233 + position[2] * 37.719) % 1) * Math.PI * 2,
    [position],
  );

  useFrame((state) => {
    if (!pulse) return;
    const t = state.clock.elapsedTime * 1.1 + phase;
    const wave = 0.5 + 0.5 * Math.sin(t);
    if (haloRef.current) {
      const scale = 1 + wave * 0.35;
      haloRef.current.scale.setScalar(scale);
      const mat = haloRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.2 + wave * 0.22;
    }
    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.75 + wave * 0.25;
    }
  });

  return (
    <group position={position}>
      <mesh ref={haloRef}>
        <sphereGeometry args={[size * 2.6, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <mesh ref={coreRef}>
        <sphereGeometry args={[size, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.95} />
      </mesh>
    </group>
  );
}
