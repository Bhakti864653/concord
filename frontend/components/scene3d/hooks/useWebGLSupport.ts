"use client";

import { useEffect, useState } from "react";

// null = not yet checked (renders the safe static fallback while
// checking), true/false = the actual result. A scene should only mount
// once this is explicitly true, never on null.
export function useWebGLSupport(): boolean | null {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    // document.createElement is unavailable during SSR - has to run
    // post-mount, same documented exception ThemeToggle.tsx uses for its
    // own first read of external (non-React) state.
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSupported(!!gl);
    } catch {
      setSupported(false);
    }
  }, []);

  return supported;
}
