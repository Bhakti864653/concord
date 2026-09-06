// Two overlapping circles: mentee + mentor, matched. Kept as plain
// currentColor line-art so it follows the page's own text color in both
// light and dark mode without any extra theming work.
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
      <circle cx="10" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
