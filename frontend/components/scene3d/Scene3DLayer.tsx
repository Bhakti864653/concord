"use client";

import type { ComponentType, ReactNode } from "react";
import { useReducedMotion } from "./hooks/useReducedMotion";
import { useWebGLSupport } from "./hooks/useWebGLSupport";

/**
 * The shared progressive-enhancement gate all three experiences mount
 * through: the caller's own purpose-built fallback is always in the DOM
 * first (so the page is never blank while a scene's JS chunk downloads,
 * and it's the permanent view under reduced-motion or no WebGL), and the
 * live 3D scene only fades in on top once both checks pass. `Scene` should
 * already be a `next/dynamic(..., { ssr: false })` component created at
 * its own call site (not here) so each experience controls its own
 * code-split chunk. `fallback` is a real, distinct visual per experience
 * (see LandingStaticFallback/MatchStaticFallback/AlgorithmStaticFallback) -
 * not shared - since a single generic fallback can't do justice to three
 * differently-composed scenes. Any real accessible text (names, labels,
 * status) belongs in HTML the caller renders alongside this, not inside
 * either the fallback or the 3D scene - both are purely visual and stay
 * aria-hidden.
 */
export default function Scene3DLayer<P extends object>({
  Scene,
  sceneProps,
  fallback,
  className = "",
}: {
  Scene: ComponentType<P>;
  sceneProps: P;
  fallback: ReactNode;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();
  const webglSupported = useWebGLSupport();
  const canRender3D = !reducedMotion && webglSupported === true;

  // Two nested divs, deliberately not one: `className` is the caller's own
  // positioning (often itself `absolute inset-0 ...` against some further
  // ancestor), so it can't also carry `position: relative` here - the two
  // `position` values would collide and whichever utility Tailwind happens
  // to order last would silently win, collapsing this whole subtree to
  // 0x0 (exactly what happened before this was split: the outer element
  // needs the caller's own position, the inner one needs its own separate
  // `relative` to anchor the absolutely-positioned fallback/scene layers).
  return (
    <div className={className} aria-hidden="true">
      <div className="relative h-full w-full">
        <div
          className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${
            canRender3D ? "opacity-0" : "opacity-100"
          }`}
        >
          {fallback}
        </div>
        {canRender3D && (
          <div className="absolute inset-0 h-full w-full">
            <Scene {...sceneProps} />
          </div>
        )}
      </div>
    </div>
  );
}
