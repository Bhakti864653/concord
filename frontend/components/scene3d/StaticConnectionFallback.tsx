// The permanent, zero-JS-required visual: two curved paths (mentee purple,
// mentor coral) converging toward a shared accord-green point, with a few
// small nodes along each. Plain SVG reading the same CSS custom properties
// as the rest of the app, so it matches light/dark automatically with no
// script.
//
// Serves three roles at once, deliberately: (1) it's what every device
// paints first, before any JS has run, so the page is never blank while the
// 3D chunk downloads; (2) it's the permanent view for prefers-reduced-motion
// and no-WebGL users - note it holds no CSS animation of its own, so it
// satisfies "no continuous animation" without a separate reduced-motion
// variant; (3) each caller fades their live canvas in over it rather than
// replacing it, so there's never a hard cut between the two.
export default function StaticConnectionFallback({
  variant = "landing",
  className = "",
}: {
  variant?: "landing" | "reveal" | "algorithm";
  className?: string;
}) {
  const nodeR = variant === "reveal" ? 3.2 : 2.6;

  return (
    <svg
      viewBox="0 0 400 260"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
      aria-hidden="true"
    >
      <path
        d="M -20 40 C 90 30, 150 90, 200 130 S 300 210, 420 190"
        fill="none"
        stroke="var(--mentee-glow)"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M 420 30 C 320 25, 250 90, 200 130 S 100 215, -20 220"
        fill="none"
        stroke="var(--mentor-glow)"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.6"
      />

      <circle cx="70" cy="36" r={nodeR} fill="var(--mentee)" opacity="0.85" />
      <circle cx="140" cy="70" r={nodeR} fill="var(--mentee)" opacity="0.7" />
      <circle cx="330" cy="34" r={nodeR} fill="var(--mentor)" opacity="0.85" />
      <circle cx="260" cy="72" r={nodeR} fill="var(--mentor)" opacity="0.7" />

      <circle cx="200" cy="130" r={nodeR + 2.5} fill="var(--accord-glow)" opacity="0.35" />
      <circle cx="200" cy="130" r={nodeR} fill="var(--accord)" opacity="0.9" />
    </svg>
  );
}
