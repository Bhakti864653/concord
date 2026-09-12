"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { useIsCompactDevice } from "./hooks/useIsCompactDevice";

/**
 * The one shared R3F <Canvas> wrapper every scene mounts through. Pointer
 * events are disabled on the canvas element itself - parallax reads pointer
 * position at the window level instead (see useParallax) - so the canvas
 * can never intercept a click or a scroll meant for real page content.
 *
 * Rendering pauses (frameloop "never") whenever the canvas scrolls off
 * screen, resuming when it's visible again, so an off-screen scene doesn't
 * keep spending frames.
 *
 * Also seeds a minimal, deliberately cheap lighting + fog rig (two lights,
 * no shadows) so ribbon/core geometry can use a lit material and actually
 * show volume - the first pass of this system used only unlit
 * MeshBasicMaterial everywhere, which is why it read as flat despite being
 * "3D". `fogColor` should be the caller's current `--paper` token so
 * distant geometry fades toward the page background instead of a fixed
 * color that would clash across themes.
 */
export default function ConcordSceneCanvas({
  children,
  cameraPosition = [0, 0, 8],
  fov = 38,
  className = "",
  fogColor = "#fbfaf7",
  fogRange,
  lights = true,
}: {
  children: ReactNode;
  cameraPosition?: [number, number, number];
  fov?: number;
  className?: string;
  fogColor?: string;
  fogRange?: [number, number];
  lights?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const compact = useIsCompactDevice();
  const [near, far] = fogRange ?? [4, 13];

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.01,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={className}>
      <Canvas
        dpr={compact ? [1, 1.5] : [1, 2]}
        frameloop={visible ? "always" : "never"}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        camera={{ position: cameraPosition, fov }}
        style={{ pointerEvents: "none", width: "100%", height: "100%" }}
      >
        <fog attach="fog" args={[fogColor, near, far]} />
        {lights && (
          <>
            {/* Soft warm key light, upper-front - gives ribbons a lit,
                dimensional highlight instead of flat unlit color. */}
            <directionalLight position={[3, 4, 5]} intensity={1.1} color="#fff2e0" />
            {/* Cool, low-intensity fill from the opposite side so the
                unlit side of the geometry doesn't go fully black. */}
            <directionalLight position={[-4, -2, -3]} intensity={0.35} color="#c9d6ff" />
            <hemisphereLight args={["#fff7ec", "#2a2440", 0.45]} />
          </>
        )}
        {children}
      </Canvas>
    </div>
  );
}
