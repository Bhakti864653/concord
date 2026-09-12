/**
 * The permanent, zero-JS view of the match-reveal scene - what shows
 * before the 3D chunk loads, and the permanent view under reduced motion
 * or no WebGL. Two identity halos connected through a row of compatibility
 * points into the same two-overlapping-rings "Concord core" motif the live
 * scene builds in 3D. Real names/labels are rendered as HTML by the caller
 * (MatchRevealOverlay/MatchHeroStatic) on top of this - this is the
 * decorative connection diagram only.
 */
export default function MatchStaticFallback({
  compatibilityCount = 3,
  className = "",
}: {
  compatibilityCount?: number;
  className?: string;
}) {
  const nodeXs = Array.from({ length: compatibilityCount }, (_, i) => {
    const t = compatibilityCount <= 1 ? 0.5 : i / (compatibilityCount - 1);
    return 32 + t * 36;
  });

  return (
    <svg
      viewBox="0 0 100 56"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="presentation"
      aria-hidden="true"
    >
      <defs>
        <filter id="match-fallback-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4.5" />
        </filter>
      </defs>

      <line x1="16" y1="28" x2="84" y2="28" stroke="var(--line)" strokeWidth="0.6" opacity="0.6" />

      <circle cx="16" cy="28" r="12" fill="var(--mentee-glow)" opacity="0.22" filter="url(#match-fallback-glow)" />
      <circle cx="16" cy="28" r="7.5" fill="none" stroke="var(--mentee)" strokeWidth="1.6" opacity="0.9" />

      <circle cx="84" cy="28" r="12" fill="var(--mentor-glow)" opacity="0.22" filter="url(#match-fallback-glow)" />
      <circle cx="84" cy="28" r="7.5" fill="none" stroke="var(--mentor)" strokeWidth="1.6" opacity="0.9" />

      {nodeXs.map((x, i) => (
        <g key={i}>
          <line x1={x} y1="20" x2={x} y2="36" stroke="var(--accord-glow)" strokeWidth="0.5" opacity="0.4" />
          <circle cx={x} cy="28" r="3" fill="var(--accord-glow)" opacity="0.3" />
          <circle cx={x} cy="28" r="1.7" fill="var(--accord)" opacity="0.9" />
        </g>
      ))}

      <circle cx="50" cy="28" r="9" fill="var(--accord-glow)" opacity="0.18" filter="url(#match-fallback-glow)" />
      <circle cx="45.5" cy="28" r="6.5" fill="none" stroke="var(--mentee)" strokeWidth="1.3" opacity="0.6" />
      <circle cx="54.5" cy="28" r="6.5" fill="none" stroke="var(--mentor)" strokeWidth="1.3" opacity="0.6" />
      <circle cx="50" cy="28" r="2.2" fill="var(--accord)" opacity="0.9" />
    </svg>
  );
}
