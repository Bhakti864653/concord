import Link from "next/link";

export default function MobileNav({ primaryMatchId }: { primaryMatchId: string | null }) {
  const items = [
    { href: "/dashboard", icon: "⌘" },
    { href: "/preferences", icon: "◎" },
    ...(primaryMatchId
      ? [
          { href: `/match/${primaryMatchId}`, icon: "✦" },
          { href: `/match/${primaryMatchId}/chat`, icon: "◫" },
          { href: `/match/${primaryMatchId}/journey`, icon: "✓" },
        ]
      : []),
  ];

  return (
    <nav className="fixed inset-x-2.5 bottom-2.5 z-10 flex justify-around rounded-2xl bg-ink p-2 shadow-lg sm:hidden">
      {items.map((item) => (
        <Link
          key={item.href + item.icon}
          href={item.href}
          className="rounded-xl px-4 py-2 text-lg text-paper/80 hover:bg-mentee-glow/40"
        >
          {item.icon}
        </Link>
      ))}
    </nav>
  );
}
