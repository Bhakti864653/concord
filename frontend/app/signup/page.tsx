"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type UserType = "mentee" | "mentor";

export default function SignupPage() {
  const router = useRouter();
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
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">I am a...</legend>
          <div className="flex gap-3">
            <label
              className={`flex-1 cursor-pointer rounded border px-3 py-2 text-center text-sm ${
                userType === "mentee" ? "border-black bg-gray-50 font-medium" : ""
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
              className={`flex-1 cursor-pointer rounded border px-3 py-2 text-center text-sm ${
                userType === "mentor" ? "border-black bg-gray-50 font-medium" : ""
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
        <input
          type="email"
          placeholder="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border px-3 py-2"
        />
        <input
          type="password"
          placeholder="Password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border px-3 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>
      <p className="text-sm">
        Already have an account?{" "}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
