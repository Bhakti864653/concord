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
 * "Two journeys" - the landing hero's introduction of the metaphor.
 * Deliberately confined to the right portion of the scene, curving toward
 * a compact ConcordCore anchored close to the match-preview card, rather
 * than spanning the full width - the composition (spread, offset, core
 * size) plus the opacity mask in LandingJourneyVisual.tsx are what keep
 * every ribbon/node/branch/glow clear of the headline, paragraph, buttons,
 * and "How it works" row instead of crossing them.
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
    <ConcordSceneCanvas
      className="h-full w-full"
      cameraPosition={[0, 0, 7.2]}
      fov={34}
      fogColor={colors.paper}
      fogRange={[5, 10.5]}
    >
      <ParallaxRig>
        <group
          position={compact ? [1.5, -0.75, 0] : [2.35, -0.15, 0]}
          scale={compact ? 0.7 : 0.9}
        >
          <ConvergingPaths
            progress={progress}
            menteeColor={colors.mentee}
            mentorColor={colors.mentor}
            accordColor={colors.accord}
            spread={compact ? 1.1 : 1.5}
            endPoint={[0.55, 0, 0.5]}
            compact={compact}
            lightweight={compact}
            coreScale={0.75}
          />
        </group>
      </ParallaxRig>
    </ConcordSceneCanvas>
  );
}
