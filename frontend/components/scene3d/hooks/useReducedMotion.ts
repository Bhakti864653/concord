"use client";

import { useEffect, useState } from "react";

// Starts false (matches the server-rendered default) and only flips after
// mount, same safe SSR pattern ThemeToggle already uses for its own
// useState+useEffect localStorage read - avoids a hydration mismatch since
// window.matchMedia doesn't exist during SSR.
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    // Reads matchMedia, unavailable during SSR - has to run post-mount, same
    // documented exception ThemeToggle.tsx uses for its own first read of
    // external (non-React) state.
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
