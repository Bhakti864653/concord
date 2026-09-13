/**
 * The permanent, zero-JS view of the landing hero's "two journeys" scene -
 * what every device paints before the 3D chunk loads, and the permanent
 * view under reduced motion or no WebGL. A layered ribbon composition
 * (soft background echo + a bright foreground stroke per ribbon, not a
 * single thin line) converging into the same two-overlapping-rings
 * "Concord core" motif the live scene builds in 3D, so neither version
 * reads as a downgrade of the other.
 *
 * Deliberately confined to the right ~45% of the viewBox (not spanning
 * edge to edge) - this is the same composition fix as the live 3D scene:
 * the parent's opacity mask (see LandingJourneyVisual.tsx) already keeps
 * the left column clear, but the paths themselves are drawn short and
 * right-biased too, so there's nothing wide/diagonal for that mask to be
 * doing the only work of hiding.
 */
export default function LandingStaticFallback({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 320"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
      aria-hidden="true"
    >
      <defs>
        <filter id="landing-fallback-soft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id="landing-fallback-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>

      {/* Background echoes - the same two curves, larger and blurred, for depth. */}
      <path
        d="M 260 260 C 320 250, 360 200, 390 160 S 430 90, 440 60"
        fill="none"
        stroke="var(--mentee-glow)"
        strokeWidth="16"
        strokeLinecap="round"
        opacity="0.16"
        filter="url(#landing-fallback-soft)"
      />
      <path
        d="M 470 190 C 460 150, 450 100, 440 60"
        fill="none"
        stroke="var(--mentor-glow)"
        strokeWidth="14"
        strokeLinecap="round"
        opacity="0.16"
        filter="url(#landing-fallback-soft)"
      />

      {/* Foreground ribbons - a bright core stroke plus a slightly offset,
          lighter highlight stroke to suggest a lit, dimensional tube
          rather than a flat line. */}
      <path
        d="M 265 255 C 322 246, 358 198, 388 158 S 428 88, 438 62"
        fill="none"
        stroke="var(--mentee)"
        strokeWidth="5.5"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M 265 249 C 322 240, 358 192, 388 152 S 428 83, 438 57"
        fill="none"
        stroke="var(--mentee-glow)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.55"
      />

      <path
        d="M 468 185 C 459 147, 449 100, 439 63"
        fill="none"
        stroke="var(--mentor)"
        strokeWidth="5.5"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M 462 183 C 453 146, 444 99, 434 62"
        fill="none"
        stroke="var(--mentor-glow)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.55"
      />

      {/* A couple of small branch/experience nodes along each ribbon. */}
      <circle cx="355" cy="205" r="4" fill="var(--mentee)" opacity="0.85" />
      <circle cx="405" cy="120" r="3.6" fill="var(--mentee-glow)" opacity="0.65" />
      <circle cx="453" cy="145" r="4" fill="var(--mentor)" opacity="0.85" />
      <circle cx="443" cy="105" r="3.6" fill="var(--mentor-glow)" opacity="0.65" />

      {/* The Concord core - two overlapping rings where the ribbons meet - ~25% smaller than the ribbon-scale rings would be. */}
      <circle cx="435" cy="55" r="23" fill="var(--accord-glow)" opacity="0.25" filter="url(#landing-fallback-glow)" />
      <circle
        cx="424"
        cy="57"
        r="16"
        fill="none"
        stroke="var(--mentee)"
        strokeWidth="2.8"
        opacity="0.85"
      />
      <circle
        cx="444"
        cy="55"
        r="16"
        fill="none"
        stroke="var(--mentor)"
        strokeWidth="2.8"
        opacity="0.85"
      />
      <circle cx="434" cy="56" r="4.5" fill="var(--accord)" opacity="0.9" />
    </svg>
  );
}
