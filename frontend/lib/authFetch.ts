import { createClient } from "@/lib/supabase/client";

const TIMEOUT_MS = 15_000;

export async function authFetch(path: string, options: RequestInit = {}) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not logged in");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    return await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${session.access_token}`,
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
