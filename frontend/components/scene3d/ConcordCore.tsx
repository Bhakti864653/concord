"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * The recognizable "Concord connection" moment: two overlapping translucent
 * rings (echoing the app's own two-circle brandmark, see Logo.tsx) rather
 * than a single dot. `formed` (0..1) is how complete the connection is -
 * driven by the same progress the two journey ribbons converge on - and
 * ramps up glow/opacity/scale so the core visibly *arrives* rather than
 * just sitting there from frame one.
 */
export default function ConcordCore({
  position,
  menteeColor,
  mentorColor,
  accordColor,
  scale = 1,
  formed = 1,
}: {
  position: [number, number, number];
  menteeColor: string;
  mentorColor: string;
  accordColor: string;
  scale?: number;
  formed?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const leftRef = useRef<THREE.Mesh>(null);
  const rightRef = useRef<THREE.Mesh>(null);
  const coreGlowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      // A slow, restrained tumble - "recognizable" and stable, not a
      // spinning logo. Amplitude shrinks as it approaches fully formed so
      // the finished connection settles rather than keeps drifting.
      const settle = 0.3 + 0.7 * (1 - formed);
      groupRef.current.rotation.y = Math.sin(t * 0.15) * 0.22 * settle;
      groupRef.current.rotation.x = 0.5 + Math.sin(t * 0.1) * 0.06 * settle;
      const s = scale * (0.85 + formed * 0.15);
      groupRef.current.scale.setScalar(s);
    }
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.2);
    const glowAmount = (0.35 + pulse * 0.25) * formed;
    for (const ref of [leftRef, rightRef]) {
      const mat = ref.current?.material as THREE.MeshStandardMaterial | undefined;
      if (mat) mat.emissiveIntensity = glowAmount;
    }
    if (coreGlowRef.current) {
      const mat = coreGlowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.18 + pulse * 0.22 * formed;
      coreGlowRef.current.scale.setScalar(1 + pulse * 0.15);
    }
  });

  const ringRadius = 0.44;
  const tube = 0.052;
  const gap = ringRadius * 0.5;

  return (
    <group ref={groupRef} position={position}>
      <mesh ref={leftRef} position={[-gap, 0, 0]}>
        <torusGeometry args={[ringRadius, tube, 16, 48]} />
        <meshStandardMaterial
          color={menteeColor}
          emissive={menteeColor}
          emissiveIntensity={0.35}
          transparent
          opacity={0.35 + formed * 0.4}
          roughness={0.35}
          metalness={0.05}
        />
      </mesh>
      <mesh ref={rightRef} position={[gap, 0, 0]}>
        <torusGeometry args={[ringRadius, tube, 16, 48]} />
        <meshStandardMaterial
          color={mentorColor}
          emissive={mentorColor}
          emissiveIntensity={0.35}
          transparent
          opacity={0.35 + formed * 0.4}
          roughness={0.35}
          metalness={0.05}
        />
      </mesh>
      {/* The overlap itself - a soft accord-colored glow, only really
          visible once the two rings have mostly arrived. */}
      <mesh ref={coreGlowRef}>
        <sphereGeometry args={[ringRadius * 0.4, 16, 16]} />
        <meshBasicMaterial color={accordColor} transparent opacity={0.2} depthWrite={false} />
      </mesh>
    </group>
  );
}
