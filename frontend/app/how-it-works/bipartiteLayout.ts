export type LayoutPoint = { id: string; xPct: number; yPct: number };

/**
 * The mentee-column/mentor-column layout, as percentages of the diagram's
 * own box - shared by AlgorithmStaticFallback.tsx (draws it in SVG) and
 * StableMatchingVisualizer.tsx (positions the real HTML name/capacity
 * overlay with it when the 3D scene isn't rendering, e.g. no WebGL). The
 * live 3D scene positions its own nodes independently and reports their
 * actual screen position via ScreenProjector - this is only the fallback
 * source of truth for where nodes "are" when nothing is being projected.
 */
export function bipartiteLayout(menteeIds: string[], mentorIds: string[]): LayoutPoint[] {
  function column(ids: string[], xPct: number): LayoutPoint[] {
    const n = ids.length;
    return ids.map((id, i) => ({
      id,
      xPct,
      yPct: n <= 1 ? 50 : 18 + (64 * i) / (n - 1),
    }));
  }
  return [...column(menteeIds, 20), ...column(mentorIds, 80)];
}
