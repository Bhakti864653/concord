import Badge, { type BadgeTone } from "@/components/ui/Badge";

export type MatchReasonChip = { label: string; tone?: BadgeTone };

/**
 * Up to three short "why this match" chips, replacing a paragraph of prose
 * with scannable tags. Callers build the chip list from data that already
 * exists (matchReasons()'s shared words/tags, or the /explanation endpoint's
 * rank/capacity fields) - this component only renders, it invents nothing.
 */
export default function MatchReasonChips({ reasons }: { reasons: MatchReasonChip[] }) {
  if (reasons.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Why this match">
      {reasons.slice(0, 3).map((r) => (
        <li key={r.label}>
          <Badge tone={r.tone ?? "accord"}>{r.label}</Badge>
        </li>
      ))}
    </ul>
  );
}
