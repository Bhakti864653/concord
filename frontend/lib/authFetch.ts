import { createClient } from "@/lib/supabase/client";
import { redirectToLoginExpired } from "@/lib/sessionExpired";

const TIMEOUT_MS = 15_000;

async function send(path: string, options: RequestInit, accessToken: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    return await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("That took too long and timed out. Please try again.");
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function authFetch(path: string, options: RequestInit = {}) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    redirectToLoginExpired();
    throw new Error("Your login has expired. Please log in again.");
  }

  const res = await send(path, options, session.access_token);
  if (res.status !== 401) return res;

  // The stored token was stale (e.g. the tab slept past its ~1h lifetime).
  // Refresh once and retry before giving up on the session.
  const { data: refreshed, error } = await supabase.auth.refreshSession();
  if (!error && refreshed.session) {
    const retry = await send(path, options, refreshed.session.access_token);
    if (retry.status !== 401) return retry;
  }

  redirectToLoginExpired();
  throw new Error("Your login has expired. Please log in again.");
}
