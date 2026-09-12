"use client";

import { useEffect, useState } from "react";

export type ConcordColors = {
  mentee: string;
  menteeTint: string;
  menteeGlow: string;
  mentor: string;
  mentorTint: string;
  mentorGlow: string;
  accord: string;
  accordTint: string;
  accordGlow: string;
  danger: string;
  dangerTint: string;
  paper: string;
  paperRaised: string;
  ink: string;
  line: string;
};

const VAR_NAMES: Record<keyof ConcordColors, string> = {
  mentee: "--mentee",
  menteeTint: "--mentee-tint",
  menteeGlow: "--mentee-glow",
  mentor: "--mentor",
  mentorTint: "--mentor-tint",
  mentorGlow: "--mentor-glow",
  accord: "--accord",
  accordTint: "--accord-tint",
  accordGlow: "--accord-glow",
  danger: "--danger",
  dangerTint: "--danger-tint",
  paper: "--paper",
  paperRaised: "--paper-raised",
  ink: "--ink",
  line: "--line",
};

// The light-theme values from app/globals.css :root - only used as the
// initial state before the first client-side read, since these scenes are
// always mounted client-only (see ConcordSceneCanvas), never during SSR.
const LIGHT_FALLBACK: ConcordColors = {
  mentee: "#514299",
  menteeTint: "#eeeafd",
  menteeGlow: "#6656ad",
  mentor: "#a64526",
  mentorTint: "#fff0eb",
  mentorGlow: "#f2a58f",
  accord: "#28735f",
  accordTint: "#dceee5",
  accordGlow: "#4fae8e",
  danger: "#a54535",
  dangerTint: "#fbeae6",
  paper: "#fbfaf7",
  paperRaised: "#ffffff",
  ink: "#202238",
  line: "#e8e5ef",
};

function readColors(): ConcordColors {
  const style = getComputedStyle(document.documentElement);
  const entries = Object.entries(VAR_NAMES) as [keyof ConcordColors, string][];
  const result = { ...LIGHT_FALLBACK };
  for (const [key, cssVar] of entries) {
    const value = style.getPropertyValue(cssVar).trim();
    if (value) result[key] = value;
  }
  return result;
}

// Three.js materials need real color values, not CSS custom properties, so
// this reads the same tokens app/globals.css defines and re-reads them
// whenever the theme changes (the toggle sets a `data-theme` attribute, or
// the OS-level scheme changes) so every scene stays in sync with the rest
// of the app automatically instead of hardcoding a second copy of the
// palette.
export function useConcordColors(): ConcordColors {
  const [colors, setColors] = useState<ConcordColors>(LIGHT_FALLBACK);

  useEffect(() => {
    // getComputedStyle is unavailable during SSR - has to run post-mount,
    // same documented exception ThemeToggle.tsx uses for its own first read
    // of external (non-React) state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setColors(readColors());

    const observer = new MutationObserver(() => setColors(readColors()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onSchemeChange = () => setColors(readColors());
    query.addEventListener("change", onSchemeChange);

    return () => {
      observer.disconnect();
      query.removeEventListener("change", onSchemeChange);
    };
  }, []);

  return colors;
}
