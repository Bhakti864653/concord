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
    <nav className="flex flex-wrap gap-1 border-b border-line">
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <Link
            key={tab.key}
            href={tab.href(id)}
            aria-current={isActive ? "page" : undefined}
            className={`focus-ring flex items-center gap-1.5 px-3 py-2 text-sm font-medium ${
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
