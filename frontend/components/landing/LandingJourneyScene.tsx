"use client";

import { type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import ConcordSceneCanvas from "@/components/scene3d/ConcordSceneCanvas";
import ConvergingPaths from "@/components/scene3d/ConvergingPaths";
import { usePointerParallax } from "@/components/scene3d/hooks/usePointerParallax";
import { useIsCompactDevice } from "@/components/scene3d/hooks/useIsCompactDevice";
import type { ConcordColors } from "@/components/scene3d/hooks/useConcordColors";

// Very small camera nudge toward the pointer - "may create very subtle
// depth or camera parallax" per spec. usePointerParallax already no-ops on
// touch devices, so this is desktop-only by construction.
function ParallaxRig({ children }: { children: ReactNode }) {
  const pointer = usePointerParallax();
  useFrame(({ camera }) => {
    const targetX = pointer.current.x * 0.35;
    const targetY = -pointer.current.y * 0.22;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.04);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.04);
    camera.lookAt(0, 0, 0);
  });
  return <>{children}</>;
}

/**
 * "Two journeys" - the landing hero's introduction of the metaphor. Sits
 * behind the hero copy, biased toward the right side where the match
 * preview card lives on wide screens, so the paths visually resolve toward
 * it rather than toward empty space.
 */
export default function LandingJourneyScene({
  progress,
  colors,
}: {
  progress: number;
  colors: ConcordColors;
}) {
  const compact = useIsCompactDevice();

  return (
    <ConcordSceneCanvas className="h-full w-full" cameraPosition={[0, 0, 6.5]} fov={36}>
      <ParallaxRig>
        <group position={[1.1, -0.25, 0]} scale={compact ? 0.85 : 1.05}>
          <ConvergingPaths
            progress={progress}
            menteeColor={colors.mentee}
            mentorColor={colors.mentor}
            accordColor={colors.accord}
            spread={compact ? 2.1 : 2.8}
            endPoint={[0.4, -0.1, 0.3]}
            nodesPerPath={3}
            compact={compact}
          />
        </group>
      </ParallaxRig>
    </ConcordSceneCanvas>
  );
}
