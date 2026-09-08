import Link from "next/link";
import NavIcon, { type NavIconName } from "@/components/NavIcon";

export default function MobileNav({ primaryMatchId }: { primaryMatchId: string | null }) {
  const items: { href: string; icon: NavIconName }[] = [
    { href: "/dashboard", icon: "home" },
    { href: "/preferences", icon: "discover" },
    ...(primaryMatchId
      ? ([
          { href: `/match/${primaryMatchId}`, icon: "match" },
          { href: `/match/${primaryMatchId}/chat`, icon: "messages" },
          { href: `/match/${primaryMatchId}/journey`, icon: "journey" },
        ] as { href: string; icon: NavIconName }[])
      : []),
  ];

  return (
    <nav className="fixed inset-x-2.5 bottom-2.5 z-10 flex justify-around rounded-2xl bg-ink p-2 shadow-lg sm:hidden">
      {items.map((item) => (
        <Link
          key={item.href + item.icon}
          href={item.href}
          className="rounded-xl px-4 py-2 text-paper/80 hover:bg-mentee-glow/40"
        >
          <NavIcon name={item.icon} />
        </Link>
      ))}
    </nav>
  );
}
