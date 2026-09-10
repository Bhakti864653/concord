"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NavIcon, { type NavIconName } from "@/components/NavIcon";

export default function MobileNav({ primaryMatchId }: { primaryMatchId: string | null }) {
  const pathname = usePathname();

  const items: { href: string; icon: NavIconName; label: string }[] = [
    { href: "/dashboard", icon: "home", label: "Home" },
    { href: "/preferences", icon: "discover", label: "Preferences" },
    ...(primaryMatchId
      ? ([
          { href: `/match/${primaryMatchId}`, icon: "match", label: "Match" },
          { href: `/match/${primaryMatchId}/chat`, icon: "messages", label: "Messages" },
        ] as { href: string; icon: NavIconName; label: string }[])
      : []),
  ];

  return (
    <nav className="fixed inset-x-2.5 bottom-2.5 z-10 flex justify-around rounded-2xl bg-ink p-2 shadow-lg sm:hidden">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={[
              "focus-ring flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 text-[10px] font-medium",
              active ? "bg-mentee-glow/40 text-paper" : "text-paper/80 hover:bg-mentee-glow/40",
            ].join(" ")}
          >
            <NavIcon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
