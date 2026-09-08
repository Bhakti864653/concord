import Link from "next/link";
import NavIcon, { type NavIconName } from "@/components/NavIcon";

const TABS = [
  { key: "overview", label: "Overview", icon: "overview" as NavIconName },
  { key: "chat", label: "Chat", icon: "messages" as NavIconName },
  { key: "availability", label: "Availability", icon: "availability" as NavIconName },
  { key: "journey", label: "Journey", icon: "journey" as NavIconName },
  { key: "notes", label: "Notes", icon: "notes" as NavIconName },
  { key: "checkin", label: "Check-in", icon: "checkin" as NavIconName },
  { key: "safety", label: "Safety", icon: "safety" as NavIconName },
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
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.key === "overview" ? `/match/${id}` : `/match/${id}/${tab.key}`}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium ${
            active === tab.key
              ? "border-b-2 border-ink text-ink"
              : "text-muted hover:text-ink"
          }`}
        >
          <NavIcon name={tab.icon} />
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
