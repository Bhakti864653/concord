import MatchIdentity from "@/components/mentorship/MatchIdentity";
import MatchReasonChips, { type MatchReasonChip } from "@/components/mentorship/MatchReasonChips";

/**
 * The calm, always-available match hero: two identities, the small
 * converge-circle motif, the reason chips. Unchanged from before the 3D
 * reveal work - extracted verbatim into its own component so
 * MatchHeroReveal.tsx can render it as the permanent base layer (what SSR,
 * no-JS, reduced-motion, no-WebGL, and every *returning* visit all show)
 * with the one-time dramatic sequence layered on top only for a first
 * viewing. This is also the "subtle static connected-path motif" the spec
 * asks to persist near the match header after the reveal - the
 * converge-left/right circles already were that, unaltered here.
 */
export default function MatchHeroStatic({
  ownRole,
  ownTopic,
  counterpartRole,
  counterpartTopic,
  reasonChips,
  onReplay,
}: {
  ownRole: "mentee" | "mentor";
  ownTopic: string;
  counterpartRole: "mentee" | "mentor";
  counterpartTopic: string;
  reasonChips: MatchReasonChip[];
  /** Omitted (not just disabled) when a replay can't actually run - see MatchHeroReveal.tsx. */
  onReplay?: () => void;
}) {
  return (
    <section className="match-reveal-in concord-lift relative flex flex-col items-center gap-5 rounded-[28px] bg-paper-raised px-5 py-7 sm:px-8">
      <div className="flex w-full flex-col items-center gap-4 lg:flex-row lg:justify-between lg:gap-8">
        <MatchIdentity
          role={ownRole}
          roleLabel="You"
          topic={ownTopic}
          size="lg"
          align="start"
        />
        <svg width="44" height="34" viewBox="0 0 28 24" aria-hidden="true" className="shrink-0">
          <circle className="converge-left" cx="10" cy="12" r="9" fill="var(--mentee-glow)" fillOpacity="0.75" />
          <circle className="converge-right" cx="18" cy="12" r="9" fill="var(--mentor-glow)" fillOpacity="0.9" />
        </svg>
        <MatchIdentity
          role={counterpartRole}
          roleLabel={ownRole === "mentee" ? "Your mentor" : "Your mentee"}
          topic={counterpartTopic}
          size="lg"
          align="end"
        />
      </div>

      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-accord text-paper"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M5 12l4 4L19 6" />
          </svg>
        </span>
        <h1 className="font-display text-lg font-semibold tracking-tight text-ink">
          You&apos;ve been matched!
        </h1>
      </div>

      <MatchReasonChips reasons={reasonChips} />

      {onReplay && (
        <button
          type="button"
          onClick={onReplay}
          className="focus-ring rounded text-xs text-muted underline hover:text-ink"
        >
          Replay reveal
        </button>
      )}
    </section>
  );
}
