/**
 * The permanent, zero-JS view of the landing hero's "two journeys" scene -
 * what every device paints before the 3D chunk loads, and the permanent
 * view under reduced motion or no WebGL. A layered ribbon composition
 * (soft background echo + a bright foreground stroke per ribbon, not a
 * single thin line) converging into the same two-overlapping-rings
 * "Concord core" motif the live scene builds in 3D, so neither version
 * reads as a downgrade of the other.
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
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <filter id="landing-fallback-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
      </defs>

      {/* Background echoes - the same two curves, larger and blurred, for depth. */}
      <path
        d="M -30 250 C 80 260, 150 190, 210 170 S 340 90, 470 60"
        fill="none"
        stroke="var(--mentee-glow)"
        strokeWidth="26"
        strokeLinecap="round"
        opacity="0.18"
        filter="url(#landing-fallback-soft)"
      />
      <path
        d="M 470 260 C 380 250, 300 190, 240 165 S 130 90, -30 40"
        fill="none"
        stroke="var(--mentor-glow)"
        strokeWidth="26"
        strokeLinecap="round"
        opacity="0.18"
        filter="url(#landing-fallback-soft)"
      />

      {/* Foreground ribbons - a bright core stroke plus a slightly offset,
          lighter highlight stroke to suggest a lit, dimensional tube
          rather than a flat line. */}
      <path
        d="M -20 240 C 85 248, 150 185, 205 165 S 330 92, 450 65"
        fill="none"
        stroke="var(--mentee)"
        strokeWidth="9"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M -20 234 C 85 240, 150 178, 205 158 S 330 86, 450 59"
        fill="none"
        stroke="var(--mentee-glow)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.55"
      />

      <path
        d="M 450 250 C 370 242, 295 185, 235 160 S 125 88, -20 42"
        fill="none"
        stroke="var(--mentor)"
        strokeWidth="9"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M 450 244 C 370 236, 295 178, 235 153 S 125 82, -20 36"
        fill="none"
        stroke="var(--mentor-glow)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.55"
      />

      {/* A couple of small branch/experience nodes along each ribbon. */}
      <circle cx="130" cy="205" r="5.5" fill="var(--mentee)" opacity="0.85" />
      <circle cx="290" cy="115" r="5" fill="var(--mentee-glow)" opacity="0.65" />
      <circle cx="330" cy="205" r="5.5" fill="var(--mentor)" opacity="0.85" />
      <circle cx="180" cy="115" r="5" fill="var(--mentor-glow)" opacity="0.65" />

      {/* The Concord core - two overlapping rings where the ribbons meet. */}
      <circle cx="420" cy="52" r="30" fill="var(--accord-glow)" opacity="0.25" filter="url(#landing-fallback-glow)" />
      <circle
        cx="405"
        cy="55"
        r="21"
        fill="none"
        stroke="var(--mentee)"
        strokeWidth="3.5"
        opacity="0.85"
      />
      <circle
        cx="432"
        cy="52"
        r="21"
        fill="none"
        stroke="var(--mentor)"
        strokeWidth="3.5"
        opacity="0.85"
      />
      <circle cx="418" cy="53" r="6" fill="var(--accord)" opacity="0.9" />
    </svg>
  );
}
