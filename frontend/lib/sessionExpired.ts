// Shared "your login ran out" handling for the signed-in app.
//
// Supabase access tokens only last about an hour. The browser client normally
// refreshes them in the background, but a tab left asleep (laptop closed,
// backgrounded for hours) can wake up holding a token the backend rejects,
// or a refresh token that no longer works at all. Without this, the page kept
// showing stale content and every button failed with a raw "Invalid token".

let intentionalSignOut = false;
let redirecting = false;

// Called by the Log out button right before signOut(), so the SIGNED_OUT
// event it fires isn't mistaken for an expired session.
export function markIntentionalSignOut() {
  intentionalSignOut = true;
}

export function isIntentionalSignOut() {
  return intentionalSignOut;
}

// Only same-site relative paths - never let ?next= send someone off-site.
export function safeNextPath(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export function redirectToLoginExpired() {
  if (redirecting || typeof window === "undefined") return;
  redirecting = true;
  const next = window.location.pathname + window.location.search;
  // Hard navigation, same reasoning as LogoutButton: the login page's
  // server render must see the cleared cookie.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = `/login?expired=1&next=${encodeURIComponent(next)}`;
}
