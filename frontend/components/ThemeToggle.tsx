"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "concord-theme";

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
    </svg>
  );
}

/**
 * Explicit light/dark switch, independent of the OS preference the app
 * otherwise follows automatically. The first click always sets an explicit
 * preference (persisted to localStorage) that overrides the system setting
 * from then on - see the inline script in app/layout.tsx for how that
 * preference gets applied before first paint, avoiding a flash of the
 * wrong theme, and globals.css for how `data-theme` overrides the plain
 * `prefers-color-scheme` media query in both directions.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    // Reads document/matchMedia, neither available during SSR - this has to
    // run post-mount, and syncing that read into state is exactly what an
    // effect is for here (not a case the "don't setState in an effect" rule
    // is meant to catch: there's no React state this could derive from
    // instead, since the real value lives in the DOM attribute a plain
    // <script> set before hydration and in the OS's own media query).
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "light" || current === "dark") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme(current);
      return;
    }
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(systemDark ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing / storage disabled - the attribute above still
      // applies for the rest of this page load, just won't persist.
    }
  }

  // Nothing rendered until the effect above resolves the real theme, so
  // the icon never briefly shows the wrong state on load.
  if (theme === null) {
    return <span className="block h-9 w-9" aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:text-ink"
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
