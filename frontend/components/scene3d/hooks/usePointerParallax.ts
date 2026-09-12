"use client";

import { useEffect, useRef } from "react";

/**
 * Tracks normalized (-1..1) pointer position at the `window` level, not on
 * the canvas - the canvas has pointer-events disabled (see
 * ConcordSceneCanvas) so it never steals clicks/scroll from real content,
 * so parallax has to read the pointer from outside it. Returns a ref
 * (mutated in place, no re-renders) meant to be read inside a scene's
 * useFrame callback. Only active for devices with a fine pointer (desktop
 * mouse/trackpad) - touch devices get no parallax, per spec.
 */
export function usePointerParallax() {
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;

    function onMove(e: PointerEvent) {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return pointer;
}
