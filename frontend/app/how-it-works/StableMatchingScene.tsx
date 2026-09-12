"use client";

import { useMemo } from "react";
import ConcordSceneCanvas from "@/components/scene3d/ConcordSceneCanvas";
import ConnectionNode from "@/components/scene3d/ConnectionNode";
import ProposalLine from "@/components/scene3d/ProposalLine";
import { useIsCompactDevice } from "@/components/scene3d/hooks/useIsCompactDevice";
import type { ConcordColors } from "@/components/scene3d/hooks/useConcordColors";

function columnPositions(ids: string[], x: number): Record<string, [number, number, number]> {
  const n = ids.length;
  const positions: Record<string, [number, number, number]> = {};
  ids.forEach((id, i) => {
    const y = n <= 1 ? 0 : 1 - (2 * i) / (n - 1);
    positions[id] = [x, y * 0.8, 0];
  });
  return positions;
}

/**
 * The algorithm-transparency page's own scene: a fixed mentee column and
 * mentor column, connected by lines that reflect exactly the round the
 * visitor is looking at - solid for a held pair (dim while the algorithm
 * is still running, bright once it's the final stable round), dashed and
 * faint for this round's rejections. All node/mentor labels, capacities,
 * and the step log stay in HTML (StableMatchingVisualizer.tsx) - this
 * scene only draws the connection diagram itself.
 */
export default function StableMatchingScene({
  menteeIds,
  mentorIds,
  heldPairs,
  rejectedPairs,
  isFinalRound,
  colors,
}: {
  menteeIds: string[];
  mentorIds: string[];
  heldPairs: { mentee: string; mentor: string }[];
  rejectedPairs: { mentee: string; mentor: string }[];
  isFinalRound: boolean;
  colors: ConcordColors;
}) {
  const compact = useIsCompactDevice();
  const spread = compact ? 1.5 : 2;

  const menteePositions = useMemo(() => columnPositions(menteeIds, -spread), [menteeIds, spread]);
  const mentorPositions = useMemo(() => columnPositions(mentorIds, spread), [mentorIds, spread]);

  return (
    <ConcordSceneCanvas className="h-full w-full" cameraPosition={[0, 0, 5.2]} fov={32}>
      {menteeIds.map((id) => (
        <ConnectionNode key={`m-${id}`} position={menteePositions[id]} color={colors.mentee} size={0.08} />
      ))}
      {mentorIds.map((id) => (
        <ConnectionNode key={`t-${id}`} position={mentorPositions[id]} color={colors.mentor} size={0.08} />
      ))}

      {heldPairs.map(({ mentee, mentor }) => (
        <ProposalLine
          key={`held-${mentee}-${mentor}`}
          from={menteePositions[mentee] ?? [0, 0, 0]}
          to={mentorPositions[mentor] ?? [0, 0, 0]}
          color={colors.accord}
          style="held"
          opacity={isFinalRound ? 0.9 : 0.5}
        />
      ))}

      {rejectedPairs.map(({ mentee, mentor }, i) => (
        <ProposalLine
          key={`rej-${mentee}-${mentor}-${i}`}
          from={menteePositions[mentee] ?? [0, 0, 0]}
          to={mentorPositions[mentor] ?? [0, 0, 0]}
          color={colors.danger}
          style="rejected"
        />
      ))}

      {isFinalRound &&
        heldPairs.map(({ mentee, mentor }) => (
          <ConnectionNode
            key={`pulse-${mentee}-${mentor}`}
            position={[
              ((menteePositions[mentee]?.[0] ?? 0) + (mentorPositions[mentor]?.[0] ?? 0)) / 2,
              ((menteePositions[mentee]?.[1] ?? 0) + (mentorPositions[mentor]?.[1] ?? 0)) / 2,
              0.2,
            ]}
            color={colors.accord}
            size={0.05}
            pulse
          />
        ))}
    </ConcordSceneCanvas>
  );
}
