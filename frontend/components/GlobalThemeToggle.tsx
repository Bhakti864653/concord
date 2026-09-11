"use client";

import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

// Desktop pages inside the authenticated app shell already get a toggle in
// Sidebar.tsx - this only needs to fill the two gaps that leaves: mobile
// (the sidebar is hidden below sm) and the public/auth pages, which have no
// sidebar at all. sm:hidden below is only applied for the former case.
const APP_SHELL_ROUTE_PREFIXES = [
  "/dashboard",
  "/preferences",
  "/match",
  "/notifications",
  "/onboarding",
  "/rounds",
  "/admin",
];

export default function GlobalThemeToggle() {
  const pathname = usePathname();
  const inAppShell = APP_SHELL_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  return (
    <div className={`fixed right-3 top-3 z-40 ${inAppShell ? "sm:hidden" : ""}`}>
      <ThemeToggle />
    </div>
  );
}
