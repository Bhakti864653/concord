import Link from "next/link";
import NavIcon, { type NavIconName } from "@/components/NavIcon";

// Consolidated from the original 7 tabs (Overview/Chat/Availability/Journey/
// Notes/Check-in/Safety): Availability, Goals, Sessions, and Notes now live
// together as sections on the "Our Plan" page (still the /journey route -
// see journey/page.tsx), and "Safety" is relabeled "More" since it's the
// catch-all for trust & safety tools. Each tab carries its own href rather
// than deriving one from `key`, since the URL segments (journey, checkin,
// safety) no longer match the tab labels.
const TABS = [
  { key: "overview", label: "Overview", icon: "overview" as NavIconName, href: (id: string) => `/match/${id}` },
  { key: "chat", label: "Chat", icon: "messages" as NavIconName, href: (id: string) => `/match/${id}/chat` },
  { key: "ourplan", label: "Our Plan", icon: "journey" as NavIconName, href: (id: string) => `/match/${id}/journey` },
  { key: "checkins", label: "Check-ins", icon: "checkin" as NavIconName, href: (id: string) => `/match/${id}/checkin` },
  { key: "more", label: "More", icon: "safety" as NavIconName, href: (id: string) => `/match/${id}/safety` },
] as const;

export default function MatchTabs({
  id,
  active,
}: {
  id: string;
  active: (typeof TABS)[number]["key"];
}) {
  return (
    // flex-nowrap + overflow-x-auto instead of the old flex-wrap: on narrow
    // screens the 5 tabs scroll horizontally in one row rather than
    // wrapping to a second line. The px-1/-mx-1 pair gives the focus-ring
    // outline room so it isn't clipped by the scroll container on the
    // first/last tab.
    <nav className="-mx-1 flex flex-nowrap gap-1 overflow-x-auto border-b border-line px-1">
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <Link
            key={tab.key}
            href={tab.href(id)}
            aria-current={isActive ? "page" : undefined}
            className={`focus-ring flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm font-medium ${
              isActive ? "border-b-2 border-ink text-ink" : "text-muted hover:text-ink"
            }`}
          >
            <NavIcon name={tab.icon} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
