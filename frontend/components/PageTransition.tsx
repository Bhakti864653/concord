"use client";

import { usePathname } from "next/navigation";

/**
 * Wraps a layout's {children} so each route change replays a brief
 * fade+rise entrance instead of content just snapping into place. Keying
 * on pathname forces React to remount the wrapper div (and so restart the
 * CSS animation) on every navigation - layouts themselves don't remount on
 * nested route changes, so this is the lightest way to get a per-page
 * transition without a full animation library.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
