import Link from "next/link";
import Logo from "@/components/Logo";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-1 flex-col justify-center gap-6 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Logo />
          <h1 className="text-3xl font-semibold">Concord</h1>
        </div>
        <p className="text-gray-600">
          Mentorship matching that actually accounts for both sides&apos;
          preferences — mentees and mentors are matched using stable matching,
          not just a similarity score.
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/signup"
          className="rounded bg-black px-4 py-2 text-white hover:opacity-90"
        >
          Sign up
        </Link>
        <Link
          href="/login"
          className="rounded border px-4 py-2 hover:bg-gray-50"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}
