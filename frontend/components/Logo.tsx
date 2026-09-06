// Two overlapping circles: the mentee circle and the mentor circle, filled
// with the app's own role colors so the mark itself explains the palette -
// the overlap where they meet is the accord color, the same one used
// anywhere in the app for an actual agreed match.
export default function Logo({ className }: { className?: string }) {
  return (
    <svg
      width="28"
      height="24"
      viewBox="0 0 28 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <circle cx="10" cy="12" r="9" fill="var(--mentee-tint)" stroke="var(--mentee)" strokeWidth="1.6" />
      <circle cx="18" cy="12" r="9" fill="var(--mentor-tint)" stroke="var(--mentor)" strokeWidth="1.6" fillOpacity="0.75" />
    </svg>
  );
}
