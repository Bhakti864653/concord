"use client";

import { useEffect, useState } from "react";

// A single "give this device the lighter scene" signal - narrow viewport
// (phone/tablet) or a device that self-reports few cores. Used to cut node
// counts, path segments, and DPR ceiling, not to disable 3D outright.
export function useIsCompactDevice(): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const lowCores =
      typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4;
    const update = () => setCompact(query.matches || lowCores);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return compact;
}
