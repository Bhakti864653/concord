"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import ConcordSceneCanvas from "@/components/scene3d/ConcordSceneCanvas";
import ProposalLine from "@/components/scene3d/ProposalLine";
import ScreenProjector, { type ProjectedPoint } from "@/components/scene3d/ScreenProjector";
import { useIsCompactDevice } from "@/components/scene3d/hooks/useIsCompactDevice";
import { useDrawOnProgress } from "@/components/scene3d/hooks/useDrawOnProgress";
import type { ConcordColors } from "@/components/scene3d/hooks/useConcordColors";
import type { Proposal, Release } from "@/lib/galeShapleySim";

type Pair = { mentee: string; mentor: string };

function columnPositions(ids: string[], x: number): Record<string, [number, number, number]> {
  const n = ids.length;
  const positions: Record<string, [number, number, number]> = {};
  ids.forEach((id, i) => {
    const y = n <= 1 ? 0 : 1 - (2 * i) / (n - 1);
    positions[id] = [x, y * 0.85, 0];
  });
  return positions;
}

/** Reorders mentees so a matched pair sits on the same row as their mentor - the "calm, balanced composition" the final stable round settles into. */
function finalMenteeOrder(menteeIds: string[], mentorIds: string[], heldPairs: Pair[]): string[] {
  const mentorOf = new Map(heldPairs.map((p) => [p.mentee, p.mentor] as const));
  const byMentor = new Map<string, string>();
  for (const [mentee, mentor] of mentorOf) byMentor.set(mentor, mentee);
  const ordered = mentorIds.map((m) => byMentor.get(m)).filter((m): m is string => !!m);
  const leftover = menteeIds.filter((m) => !ordered.includes(m));
  return [...ordered, ...leftover];
}

function IdentityNode({
  position,
  color,
  active,
  capacityTotal,
  capacityFilled,
}: {
  position: [number, number, number];
  color: string;
  active: boolean;
  capacityTotal?: number;
  capacityFilled?: number;
}) {
  const ringRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const wave = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 1.4 + position[1] * 3);
    const dim = active ? 1 : 0.32;
    if (ringRef.current) {
      const mat = ringRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = (0.4 + wave * 0.2) * dim;
      mat.opacity = 0.85 * dim;
    }
    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.7 * dim;
    }
    if (haloRef.current) {
      const mat = haloRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.18 * dim;
    }
  });

  return (
    <group position={position}>
      <mesh ref={haloRef}>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0.15, 0]}>
        <torusGeometry args={[0.13, 0.016, 10, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} transparent opacity={0.85} />
      </mesh>
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.07, 14, 14]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} roughness={0.4} />
      </mesh>
      {capacityTotal !== undefined && capacityTotal > 0 && (
        <group position={[0, 0.24, 0]}>
          {Array.from({ length: capacityTotal }).map((_, i) => {
            const filled = i < (capacityFilled ?? 0);
            const x = (i - (capacityTotal - 1) / 2) * 0.09;
            return (
              <mesh key={i} position={[x, 0, 0]}>
                <circleGeometry args={[0.026, 12]} />
                <meshBasicMaterial color={color} transparent opacity={filled ? 0.95 * (active ? 1 : 0.4) : 0.18} />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
}

/**
 * The algorithm-transparency page's own scene: a mentee column and mentor
 * column, connected by lines whose behavior itself explains the algorithm -
 * new proposals draw across space, holds glow green, rejections flash then
 * retract, and a mentor bumping a held mentee visibly releases them before
 * the new connection draws in. All names/capacity numbers are real text in
 * an HTML overlay (StableMatchingVisualizer.tsx) positioned via
 * `onProjected` - this scene only draws the diagram and reports where its
 * nodes land on screen.
 */
export default function StableMatchingScene({
  menteeIds,
  mentorIds,
  mentorCapacity,
  heldPairs,
  releasedPairs,
  proposalsThisRound,
  activeIds,
  isFinalRound,
  roundKey,
  colors,
  onProjected,
}: {
  menteeIds: string[];
  mentorIds: string[];
  mentorCapacity: Record<string, number>;
  heldPairs: Pair[];
  releasedPairs: Release[];
  proposalsThisRound: Proposal[];
  activeIds: Set<string>;
  isFinalRound: boolean;
  roundKey: number;
  colors: ConcordColors;
  onProjected: (points: ProjectedPoint[]) => void;
}) {
  const compact = useIsCompactDevice();
  const spread = compact ? 1.6 : 2.1;

  const baseMenteePositions = useMemo(
    () => columnPositions(menteeIds, -spread),
    [menteeIds, spread],
  );
  const mentorPositions = useMemo(() => columnPositions(mentorIds, spread), [mentorIds, spread]);
  const reorgMenteeOrder = useMemo(
    () => finalMenteeOrder(menteeIds, mentorIds, heldPairs),
    [menteeIds, mentorIds, heldPairs],
  );
  const reorgMenteePositions = useMemo(
    () => columnPositions(reorgMenteeOrder, -spread),
    [reorgMenteeOrder, spread],
  );

  const reorgT = useDrawOnProgress(isFinalRound, 900);
  const menteePositions = useMemo(() => {
    if (!isFinalRound) return baseMenteePositions;
    const t = reorgT;
    const result: Record<string, [number, number, number]> = {};
    for (const id of menteeIds) {
      const from = baseMenteePositions[id];
      const to = reorgMenteePositions[id];
      result[id] = [
        THREE.MathUtils.lerp(from[0], to[0], t),
        THREE.MathUtils.lerp(from[1], to[1], t),
        THREE.MathUtils.lerp(from[2], to[2], t),
      ];
    }
    return result;
  }, [isFinalRound, reorgT, baseMenteePositions, reorgMenteePositions, menteeIds]);

  const t = useDrawOnProgress(roundKey, 900);
  const newHeldSet = useMemo(
    () =>
      new Set(
        proposalsThisRound.filter((p) => p.outcome === "held").map((p) => `${p.mentee}>${p.mentor}`),
      ),
    [proposalsThisRound],
  );
  const carriedHeld = heldPairs.filter((p) => !newHeldSet.has(`${p.mentee}>${p.mentor}`));
  const newHeld = heldPairs.filter((p) => newHeldSet.has(`${p.mentee}>${p.mentor}`));
  const rejected = proposalsThisRound.filter((p) => p.outcome === "rejected");

  const releaseT = Math.min(1, t / 0.3);
  const newHoldT = Math.max(0, (t - 0.3) / 0.7);
  const rejectDraw = Math.min(1, t / 0.15);
  const rejectOpacity =
    t < 0.15 ? 0.85 * (t / 0.15) : t < 0.65 ? 0.85 * (1 - (t - 0.15) / 0.5) : 0;

  const capacityByMentor = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of heldPairs) counts[p.mentor] = (counts[p.mentor] ?? 0) + 1;
    return counts;
  }, [heldPairs]);

  const projectorPoints = useMemo(
    () => [
      ...menteeIds.map((id) => ({ id, position: menteePositions[id] })),
      ...mentorIds.map((id) => ({ id, position: mentorPositions[id] })),
    ],
    [menteeIds, mentorIds, menteePositions, mentorPositions],
  );

  return (
    <ConcordSceneCanvas
      className="h-full w-full"
      cameraPosition={[0, 0, 5.4]}
      fov={30}
      fogColor={colors.paper}
      fogRange={[6, 9]}
    >
      <ScreenProjector points={projectorPoints} onUpdate={onProjected} />

      {menteeIds.map((id) => (
        <IdentityNode
          key={`m-${id}`}
          position={menteePositions[id]}
          color={colors.mentee}
          active={activeIds.size === 0 || activeIds.has(id)}
        />
      ))}
      {mentorIds.map((id) => (
        <IdentityNode
          key={`t-${id}`}
          position={mentorPositions[id]}
          color={colors.mentor}
          active={activeIds.size === 0 || activeIds.has(id)}
          capacityTotal={mentorCapacity[id] ?? 0}
          capacityFilled={capacityByMentor[id] ?? 0}
        />
      ))}

      {carriedHeld.map(({ mentee, mentor }) => (
        <ProposalLine
          key={`held-${mentee}-${mentor}`}
          from={menteePositions[mentee] ?? [0, 0, 0]}
          to={mentorPositions[mentor] ?? [0, 0, 0]}
          color={colors.accord}
          style="held"
          opacity={isFinalRound ? 0.9 : 0.55}
        />
      ))}

      {newHeld.map(({ mentee, mentor }) => (
        <ProposalLine
          key={`new-${mentee}-${mentor}-${roundKey}`}
          from={menteePositions[mentee] ?? [0, 0, 0]}
          to={mentorPositions[mentor] ?? [0, 0, 0]}
          color={colors.accord}
          style="held"
          opacity={isFinalRound ? 0.9 : 0.55}
          drawProgress={newHoldT}
        />
      ))}

      {releasedPairs.map(({ mentee, mentor }, i) => (
        <ProposalLine
          key={`released-${mentee}-${mentor}-${i}-${roundKey}`}
          from={baseMenteePositions[mentee] ?? [0, 0, 0]}
          to={mentorPositions[mentor] ?? [0, 0, 0]}
          color={colors.danger}
          style="rejected"
          opacity={0.6 * (1 - releaseT)}
        />
      ))}

      {rejected.map((p, i) => (
        <ProposalLine
          key={`rej-${p.mentee}-${p.mentor}-${i}-${roundKey}`}
          from={baseMenteePositions[p.mentee] ?? [0, 0, 0]}
          to={mentorPositions[p.mentor] ?? [0, 0, 0]}
          color={colors.danger}
          style="rejected"
          opacity={rejectOpacity}
          drawProgress={rejectDraw}
        />
      ))}
    </ConcordSceneCanvas>
  );
}

