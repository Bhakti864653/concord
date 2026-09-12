import { bipartiteLayout } from "./bipartiteLayout";

type Pair = { mentee: string; mentor: string };

/**
 * The permanent, zero-JS view of the matching diagram - what shows before
 * the 3D chunk loads, and the permanent view under reduced motion or no
 * WebGL. Unlike the landing/match fallbacks this one is genuinely dynamic:
 * it draws the *actual current round's* held/rejected connections and
 * mentor capacity, using the same bipartiteLayout the live scene's HTML
 * label overlay falls back to, so a no-WebGL visitor still gets a real,
 * legible matching diagram rather than a generic placeholder graphic.
 */
export default function AlgorithmStaticFallback({
  menteeIds,
  mentorIds,
  mentorCapacity,
  heldPairs,
  rejectedPairs,
  className = "",
}: {
  menteeIds: string[];
  mentorIds: string[];
  mentorCapacity: Record<string, number>;
  heldPairs: Pair[];
  rejectedPairs: Pair[];
  className?: string;
}) {
  const points = bipartiteLayout(menteeIds, mentorIds);
  const byId = new Map(points.map((p) => [p.id, p]));
  const capacityByMentor: Record<string, number> = {};
  for (const p of heldPairs) capacityByMentor[p.mentor] = (capacityByMentor[p.mentor] ?? 0) + 1;

  return (
    <svg
      viewBox="0 0 100 80"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="presentation"
      aria-hidden="true"
    >
      {heldPairs.map(({ mentee, mentor }) => {
        const a = byId.get(mentee);
        const b = byId.get(mentor);
        if (!a || !b) return null;
        return (
          <line
            key={`held-${mentee}-${mentor}`}
            x1={a.xPct}
            y1={a.yPct * 0.8}
            x2={b.xPct}
            y2={b.yPct * 0.8}
            stroke="var(--accord)"
            strokeWidth="1.4"
            opacity="0.85"
          />
        );
      })}

      {rejectedPairs.map(({ mentee, mentor }, i) => {
        const a = byId.get(mentee);
        const b = byId.get(mentor);
        if (!a || !b) return null;
        return (
          <line
            key={`rej-${mentee}-${mentor}-${i}`}
            x1={a.xPct}
            y1={a.yPct * 0.8}
            x2={b.xPct}
            y2={b.yPct * 0.8}
            stroke="var(--danger)"
            strokeWidth="0.9"
            strokeDasharray="3 2.5"
            opacity="0.5"
          />
        );
      })}

      {menteeIds.map((id) => {
        const p = byId.get(id);
        if (!p) return null;
        return <circle key={id} cx={p.xPct} cy={p.yPct * 0.8} r="3.4" fill="var(--mentee)" opacity="0.9" />;
      })}

      {mentorIds.map((id) => {
        const p = byId.get(id);
        if (!p) return null;
        const total = mentorCapacity[id] ?? 0;
        const filled = capacityByMentor[id] ?? 0;
        return (
          <g key={id}>
            <circle cx={p.xPct} cy={p.yPct * 0.8} r="3.4" fill="var(--mentor)" opacity="0.9" />
            {Array.from({ length: total }).map((_, i) => {
              const x = p.xPct + (i - (total - 1) / 2) * 3.4;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={p.yPct * 0.8 - 6.5}
                  r="1.1"
                  fill="var(--mentor)"
                  opacity={i < filled ? 0.95 : 0.22}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
