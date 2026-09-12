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
 */
export default function ConcordSceneCanvas({
  children,
  cameraPosition = [0, 0, 8],
  fov = 38,
  className = "",
}: {
  children: ReactNode;
  cameraPosition?: [number, number, number];
  fov?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const compact = useIsCompactDevice();

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
        {children}
      </Canvas>
    </div>
  );
}
