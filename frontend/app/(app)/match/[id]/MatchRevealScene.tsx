"use client";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import ConcordSceneCanvas from "@/components/scene3d/ConcordSceneCanvas";
import ConvergingPaths from "@/components/scene3d/ConvergingPaths";
import { useIsCompactDevice } from "@/components/scene3d/hooks/useIsCompactDevice";
import type { ConcordColors } from "@/components/scene3d/hooks/useConcordColors";

const START_Z = 6.4;
const PUSHED_Z = 4.9;

/** The one restrained camera movement the spec asks for - a slow push toward the connection as convergence completes, not a continuous drift. */
function CameraPush({ pushIn }: { pushIn: number }) {
  useFrame(({ camera }) => {
    const targetZ = THREE.MathUtils.lerp(START_Z, PUSHED_Z, pushIn);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.05);
    camera.lookAt(0, 0, 0.2);
  });
  return null;
}

/**
 * "The convergence" - the match-reveal experience's own 3D moment. Tighter
 * spread and a closer, still camera compared to the landing hero's roomier
 * ambient composition: this is a focused event the visitor watches, not
 * something to explore. `pushIn` (0..1) drives the one camera movement the
 * spec calls for, timed by the parent to the convergence stage only.
 */
export default function MatchRevealScene({
  progress,
  pushIn,
  colors,
}: {
  progress: number;
  pushIn: number;
  colors: ConcordColors;
}) {
  const compact = useIsCompactDevice();

  return (
    <ConcordSceneCanvas
      className="h-full w-full"
      cameraPosition={[0, 0, START_Z]}
      fov={36}
      fogColor={colors.paper}
      fogRange={[4.5, 8.5]}
    >
      <CameraPush pushIn={pushIn} />
      <group position={[0, 0.05, 0]} scale={compact ? 0.75 : 1}>
        <ConvergingPaths
          progress={progress}
          menteeColor={colors.mentee}
          mentorColor={colors.mentor}
          accordColor={colors.accord}
          spread={compact ? 1.7 : 2.1}
          endPoint={[0, 0, 0.35]}
          compact={compact}
          lightweight={compact}
        />
      </group>
    </ConcordSceneCanvas>
  );
}
