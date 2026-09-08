"use client";

import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Hard navigation, not router.push - guarantees the next request (and
    // any immediate sign-up/log-in after it) starts from a server render
    // that has actually seen the cleared session cookie.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  }

  return (
    <button onClick={handleLogout} className="font-medium text-muted underline hover:text-ink">
      Log out
    </button>
  );
}
