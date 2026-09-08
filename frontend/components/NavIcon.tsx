// A small consistent stroke-icon set for sidebar/mobile-nav items, replacing
// the mismatched Unicode glyphs (which even had an accidental duplicate:
// Home and How-matching-works both used "⌘"). One icon per distinct
// destination, same stroke weight/style throughout.
export type NavIconName =
  | "home"
  | "discover"
  | "rounds"
  | "match"
  | "messages"
  | "journey"
  | "checkin"
  | "safety"
  | "howitworks"
  | "notifications"
  | "admin";

const common = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export default function NavIcon({ name }: { name: NavIconName }) {
  switch (name) {
    case "home":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4 11.5 12 4l8 7.5" />
          <path d="M6 10v9h12v-9" />
        </svg>
      );
    case "discover":
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M14.8 9.2 12.8 12.8 9.2 14.8l2-3.6z" />
        </svg>
      );
    case "rounds":
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
    case "match":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M12 4.5 13.9 9l4.9.5-3.7 3.2 1.1 4.8L12 15l-4.2 2.5 1.1-4.8-3.7-3.2L9.9 9z" />
        </svg>
      );
    case "messages":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4 5.5h16v10H9l-4 3.5v-3.5H4z" />
        </svg>
      );
    case "journey":
      return (
        <svg {...common} aria-hidden="true">
          <path d="m5 13 4 4 10-10" />
        </svg>
      );
    case "checkin":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M12 19.5s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 6.8 4.2 4.2 0 0 1 19.5 9.5c0 5.4-7.5 10-7.5 10z" />
        </svg>
      );
    case "safety":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M12 4 5 6.5v5c0 4.5 3 7.5 7 8.5 4-1 7-4 7-8.5v-5z" />
        </svg>
      );
    case "howitworks":
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 16v-3.5M12 8.2h.01" />
        </svg>
      );
    case "notifications":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M6 17h12l-1.5-2V10a4.5 4.5 0 0 0-9 0v5z" />
          <path d="M10.5 20a1.7 1.7 0 0 0 3 0" />
        </svg>
      );
    case "admin":
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="12" cy="12" r="2.8" />
          <path d="M12 4.5v2M12 17.5v2M19.5 12h-2M6.5 12h-2M17.5 6.5l-1.4 1.4M7.9 16.1l-1.4 1.4M17.5 17.5l-1.4-1.4M7.9 7.9 6.5 6.5" />
        </svg>
      );
  }
}
