"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * App-wide inertial smooth scrolling (the effect behind sites that feel
 * "buttery" to scroll through, e.g. serval.com) - mounted once in the root
 * layout. Skips entirely under prefers-reduced-motion, since scroll-easing
 * is exactly the kind of vestibular-trigger motion that preference exists
 * to opt out of, and Lenis has no built-in reduced-motion awareness itself.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis();

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return null;
}
