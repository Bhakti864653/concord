"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import PageTransition from "@/components/PageTransition";

type UserType = "mentee" | "mentor";

export default function SignupPage() {
  const [userType, setUserType] = useState<UserType>("mentee");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    // If a previous account's session is still active in this browser (e.g.
    // logout hasn't fully propagated yet), sign it out first so the new
    // account's session - not a leftover one - is what ends up active.
    await supabase.auth.signOut();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { user_type: userType } },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // A hard navigation, not router.push, so the next page's server render
    // is guaranteed to see the just-written session cookie rather than a
    // stale one from a client-side transition that outraces the cookie write.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/onboarding";
  }

  return (
    <PageTransition>
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
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Create your account</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Role is chosen once, here, and never changes after signup - no
              role-switching exists anywhere else in the app. */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-ink">I am a...</legend>
            <div className="flex gap-3">
              <label
                className={`has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus-ring)] flex-1 cursor-pointer rounded-[var(--radius-control)] border px-3 py-2 text-center text-sm transition-colors ${
                  userType === "mentee"
                    ? "border-mentee bg-mentee-tint font-medium text-ink"
                    : "border-line text-muted"
                }`}
              >
                <input
                  type="radio"
                  name="userType"
                  value="mentee"
                  checked={userType === "mentee"}
                  onChange={() => setUserType("mentee")}
                  className="sr-only"
                />
                Mentee
              </label>
              <label
                className={`has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus-ring)] flex-1 cursor-pointer rounded-[var(--radius-control)] border px-3 py-2 text-center text-sm transition-colors ${
                  userType === "mentor"
                    ? "border-mentor bg-mentor-tint font-medium text-ink"
                    : "border-line text-muted"
                }`}
              >
                <input
                  type="radio"
                  name="userType"
                  value="mentor"
                  checked={userType === "mentor"}
                  onChange={() => setUserType("mentor")}
                  className="sr-only"
                />
                Mentor
              </label>
            </div>
          </fieldset>
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
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={loading} className="mt-1">
            {loading ? "Creating account..." : "Sign up"}
          </Button>
        </form>
        <p className="text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="focus-ring font-medium text-ink underline">
            Log in
          </Link>
        </p>
      </Card>
      </div>
    </main>
    </PageTransition>
  );
}
