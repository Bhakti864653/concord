import Link from "next/link";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "chat", label: "Chat" },
  { key: "availability", label: "Availability" },
  { key: "journey", label: "Journey" },
  { key: "notes", label: "Notes" },
  { key: "checkin", label: "Check-in" },
  { key: "safety", label: "Safety" },
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
          className={`px-3 py-2 text-sm font-medium ${
            active === tab.key
              ? "border-b-2 border-ink text-ink"
              : "text-muted hover:text-ink"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
