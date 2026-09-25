"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { isIntentionalSignOut, redirectToLoginExpired } from "@/lib/sessionExpired";

// Mounted once in the signed-in app shell. Sends the user to the login page
// (with a "your session expired" note) as soon as the session is gone,
// instead of leaving a dead page on screen where every action fails.
export default function SessionWatcher() {
  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && !isIntentionalSignOut()) {
        redirectToLoginExpired();
      }
    });

    // Coming back to a tab that slept for hours: check with Supabase right
    // away rather than waiting for the next click to fail.
    async function checkOnReturn() {
      if (document.visibilityState !== "visible") return;
      const { data, error } = await supabase.auth.getUser();
      if (!data.user) {
        // A network blip isn't an expired login - only react to a real
        // auth rejection.
        if (error && error.status && error.status >= 500) return;
        if (error && !error.status) return;
        // Last chance: a rejected access token with a still-good refresh
        // token is recoverable without bothering the user.
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (refreshed.session) return;
        redirectToLoginExpired();
      }
    }
    document.addEventListener("visibilitychange", checkOnReturn);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", checkOnReturn);
    };
  }, []);

  return null;
}
