"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Hard navigation - see signup/page.tsx for why, same cookie-timing
    // reasoning applies to a fresh sign-in.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/dashboard";
  }

  return (
    // Glow on a full-viewport-width wrapper, not the narrow max-w-sm column
    // below - clipping it to that column's own bounds (same element having
    // both overflow-hidden and max-w-sm) gave it a hard rectangular edge.
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden p-6">
      <div
        aria-hidden="true"
        className="concord-glow pointer-events-none fixed inset-0 -z-10"
      />
      <div className="relative mx-auto flex w-full max-w-sm flex-col gap-6">
      <Link href="/" className="focus-ring relative flex items-center gap-2 self-start rounded-lg">
        <Logo />
        <span className="font-display font-medium text-ink">Concord</span>
      </Link>
      <Card className="relative flex flex-col gap-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Log in</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={loading} className="mt-1">
            {loading ? "Logging in..." : "Log in"}
          </Button>
        </form>
        <p className="text-sm text-muted">
          Need an account?{" "}
          <Link href="/signup" className="focus-ring font-medium text-ink underline">
            Sign up
          </Link>
        </p>
      </Card>
      </div>
    </main>
  );
}
