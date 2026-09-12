"use client";

import ConcordSceneCanvas from "@/components/scene3d/ConcordSceneCanvas";
import ConvergingPaths from "@/components/scene3d/ConvergingPaths";
import { useIsCompactDevice } from "@/components/scene3d/hooks/useIsCompactDevice";
import type { ConcordColors } from "@/components/scene3d/hooks/useConcordColors";

/**
 * "The convergence" - the match-reveal experience's own 3D moment. No
 * camera parallax (unlike the landing hero): this is a focused, contained
 * event the visitor watches rather than something ambient to explore, so
 * the camera stays still and the two paths do the work.
 */
export default function MatchRevealScene({
  progress,
  colors,
}: {
  progress: number;
  colors: ConcordColors;
}) {
  const compact = useIsCompactDevice();

  return (
    <ConcordSceneCanvas className="h-full w-full" cameraPosition={[0, 0, 5.6]} fov={34}>
      <group position={[0, 0.1, 0]} scale={compact ? 0.8 : 1}>
        <ConvergingPaths
          progress={progress}
          menteeColor={colors.mentee}
          mentorColor={colors.mentor}
          accordColor={colors.accord}
          spread={compact ? 1.9 : 2.3}
          endPoint={[0, 0, 0.35]}
          nodesPerPath={3}
          compact={compact}
        />
      </group>
    </ConcordSceneCanvas>
  );
}
