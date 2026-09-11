"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Button, { type ButtonVariant } from "@/components/ui/Button";

export default function TryDemoButton({ variant = "secondary" }: { variant?: ButtonVariant }) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startDemo() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/demo/start`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Failed (${res.status})`);
      }
      const { access_token, refresh_token } = await res.json();

      const supabase = createClient();
      const { error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (sessionError) throw sessionError;

      // A hard navigation, same reasoning as signup: guarantees the
      // dashboard's server render sees the just-written session cookie.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/dashboard";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong starting the demo.");
      setStarting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant={variant} onClick={startDemo} disabled={starting}>
        {starting ? "Setting up your demo..." : "Try the demo"}
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
