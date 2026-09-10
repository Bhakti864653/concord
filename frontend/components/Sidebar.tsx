"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";
import LogoutButton from "@/app/(app)/dashboard/LogoutButton";
import NavIcon, { type NavIconName } from "@/components/NavIcon";

// Chat/our-plan/check-ins/more are tabs inside the match page itself (see
// MatchTabs) - the sidebar only needs one entry point into that page, not a
// separate top-level link per tab. Rounds & waitlist and How matching works
// are already linked as cards on the dashboard, so they don't need a
// permanent sidebar slot either - keeping this list to things used every
// visit (Bhakti flagged the old 10-item sidebar as hard to navigate).
const MENTORSHIP_LINKS = (primaryMatchId: string | null) => [
  { href: "/dashboard", label: "Home", icon: "home" as NavIconName },
  { href: "/preferences", label: "Preferences", icon: "discover" as NavIconName },
  ...(primaryMatchId
    ? [{ href: `/match/${primaryMatchId}`, label: "Your match", icon: "match" as NavIconName }]
    : []),
  { href: "/notifications", label: "Notifications", icon: "notifications" as NavIconName },
];

const REFERENCE_LINKS = [
  { href: "/rounds", label: "Rounds & waitlist", icon: "rounds" as NavIconName },
  { href: "/how-it-works", label: "How matching works", icon: "howitworks" as NavIconName },
];

export default function Sidebar({
  primaryMatchId,
  isAdmin,
  profileComplete,
}: {
  primaryMatchId: string | null;
  isAdmin: boolean;
  profileComplete: boolean;
}) {
  const pathname = usePathname();
  // "Your match" should read active for every tab inside the match page,
  // not just its own root - a prefix match covers /match/[id]/chat etc.
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col overflow-y-auto border-r border-line bg-paper-raised/70 p-5 backdrop-blur-xl sm:flex">
      <Link
        href="/dashboard"
        className="focus-ring mx-2 mb-8 flex items-center gap-2.5 rounded-lg text-lg font-bold tracking-tight text-ink"
      >
        <Logo />
        <span>Concord</span>
      </Link>

      <nav className="flex flex-col gap-1">
        <p className="px-3 pb-1 pt-3 text-[10px] font-extrabold tracking-wide text-muted">MENTORSHIP</p>
        {MENTORSHIP_LINKS(primaryMatchId).map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={[
                "focus-ring relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "text-mentee before:absolute before:-left-2 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-mentee"
                  : "text-muted hover:bg-mentee-tint hover:text-mentee",
              ].join(" ")}
            >
              <span className="flex w-5 justify-center">
                <NavIcon name={item.icon} />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        {!profileComplete && (
          <div className="rounded-[var(--radius-card)] bg-mentee p-4 text-paper">
            <strong className="block text-sm">Your profile is incomplete</strong>
            <p className="mt-1 mb-3 text-xs opacity-80">Finish it to start getting matched.</p>
            <Link
              href="/onboarding"
              className="focus-ring block rounded-[var(--radius-control)] bg-paper-raised px-3 py-2 text-center text-sm font-bold text-mentee"
            >
              Finish profile
            </Link>
          </div>
        )}

        {/* De-emphasized: reference pages and the admin console aren't part
            of the everyday flow, so they sit smaller and separate from the
            main nav above rather than competing with it for attention. */}
        <div className="flex flex-col gap-0.5 border-t border-line pt-3">
          {REFERENCE_LINKS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "focus-ring flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  active ? "text-ink" : "text-muted hover:text-ink",
                ].join(" ")}
              >
                <span className="flex w-4 justify-center opacity-70">
                  <NavIcon name={item.icon} />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin"
              aria-current={isActive("/admin") ? "page" : undefined}
              className={[
                "focus-ring flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                isActive("/admin") ? "text-ink" : "text-muted hover:text-ink",
              ].join(" ")}
            >
              <span className="flex w-4 justify-center opacity-70">
                <NavIcon name="admin" />
              </span>
              <span>Admin preview</span>
            </Link>
          )}
        </div>

        <div className="px-3">
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
