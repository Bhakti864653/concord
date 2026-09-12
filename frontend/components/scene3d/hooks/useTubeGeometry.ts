"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

/**
 * A `THREE.TubeGeometry` that disposes its previous instance whenever the
 * curve/radius/segments change, and disposes the final one on unmount.
 * R3F only auto-disposes geometries it creates itself from JSX
 * (`<tubeGeometry ... />`); a `TubeGeometry` built by hand and passed in
 * via a `geometry` prop (needed here since the curve is computed, not a
 * static arg list) is opaque to it and would otherwise leak a full set of
 * GPU buffers on every recompute - and ConvergingPaths recomputes this on
 * every scroll/entrance progress step.
 *
 * Disposal happens in an effect keyed on the geometry itself, not by
 * reaching into a ref during useMemo (which this repo's stricter
 * react-hooks rules correctly flag as a render-phase side effect): the
 * effect's cleanup for the *previous* geometry runs right before the
 * effect for a *new* one, which disposes exactly the right instance
 * without needing to track "previous" by hand.
 */
export function useTubeGeometry(
  curve: THREE.Curve<THREE.Vector3>,
  radius: number,
  segments: number,
  radialSegments = 8,
): THREE.TubeGeometry {
  const geometry = useMemo(
    () => new THREE.TubeGeometry(curve, segments, radius, radialSegments, false),
    [curve, radius, segments, radialSegments],
  );

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  return geometry;
}
