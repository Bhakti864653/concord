/**
 * The permanent, zero-JS view of the landing hero's "two journeys" scene -
 * what every device paints before the 3D chunk loads, and the permanent
 * view under reduced motion or no WebGL. A layered ribbon composition
 * (soft background echo + a bright foreground stroke per ribbon, not a
 * single thin line) converging into the same two-overlapping-rings
 * "Concord core" motif the live scene builds in 3D, so neither version
 * reads as a downgrade of the other.
 *
 * Confined to the right ~45% of the viewBox, with the core placed at the
 * visual area's own center (not tucked into the top-right corner): one
 * path rises from the lower-left of that area, the other descends from
 * the upper-right, meeting the core from clearly different angles. Two
 * paths hanging straight down in parallel from rings at the very top read
 * as scissors or balloon strings - approaching from opposing diagonals is
 * what makes it read as two journeys actually converging.
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
        d="M 252 200 C 280 232, 306 214, 320 178 S 335 154, 344 153"
        fill="none"
        stroke="var(--mentee-glow)"
        strokeWidth="16"
        strokeLinecap="round"
        opacity="0.16"
        filter="url(#landing-fallback-soft)"
      />
      <path
        d="M 396 46 C 380 82, 407 100, 398 128 S 366 150, 349 151"
        fill="none"
        stroke="var(--mentor-glow)"
        strokeWidth="14"
        strokeLinecap="round"
        opacity="0.16"
        filter="url(#landing-fallback-soft)"
      />

      {/* Foreground ribbons - a bright core stroke plus a slightly offset,
          lighter highlight stroke to suggest a lit, dimensional tube
          rather than a flat line. Mentee sweeps in from the lower-left of
          the visual area with a dip-then-rise bow; mentor bulges down from
          the upper-right with its own, differently-shaped curve - distinct
          silhouettes approaching from different angles, not a symmetric V
          or two lines dropping in parallel from the rings. */}
      <path
        d="M 258 202 C 284 232, 308 216, 322 180 S 336 156, 346 155"
        fill="none"
        stroke="var(--mentee)"
        strokeWidth="5.5"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M 252 197 C 279 226, 302 211, 316 175 S 331 151, 341 150"
        fill="none"
        stroke="var(--mentee-glow)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />

      <path
        d="M 391 48 C 375 84, 402 102, 393 130 S 361 152, 344 153"
        fill="none"
        stroke="var(--mentor)"
        strokeWidth="5.5"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M 397 44 C 381 80, 408 98, 399 126 S 367 148, 350 149"
        fill="none"
        stroke="var(--mentor-glow)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* A couple of small branch/experience nodes along each ribbon. */}
      <circle cx="303" cy="203" r="4" fill="var(--mentee)" opacity="0.85" />
      <circle cx="272" cy="213" r="3.6" fill="var(--mentee-glow)" opacity="0.6" />
      <circle cx="398" cy="110" r="4" fill="var(--mentor)" opacity="0.85" />
      <circle cx="380" cy="70" r="3.6" fill="var(--mentor-glow)" opacity="0.6" />

      {/* The Concord core - two overlapping rings, sitting at the visual
          area's own center rather than its top corner. */}
      <circle cx="352" cy="150" r="23" fill="var(--accord-glow)" opacity="0.25" filter="url(#landing-fallback-glow)" />
      <circle
        cx="341"
        cy="152"
        r="16"
        fill="none"
        stroke="var(--mentee)"
        strokeWidth="2.8"
        opacity="0.85"
      />
      <circle
        cx="361"
        cy="150"
        r="16"
        fill="none"
        stroke="var(--mentor)"
        strokeWidth="2.8"
        opacity="0.85"
      />
      <circle cx="351" cy="151" r="4.5" fill="var(--accord)" opacity="0.9" />
    </svg>
  );
}
