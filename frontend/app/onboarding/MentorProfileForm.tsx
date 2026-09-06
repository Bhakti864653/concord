"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/authFetch";
import { CIRCUMSTANCE_TAGS } from "@/lib/tags";

export default function MentorProfileForm() {
  const router = useRouter();
  const [mentorsIn, setMentorsIn] = useState("");
  const [background, setBackground] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [otherTagText, setOtherTagText] = useState("");
  const [availabilityCount, setAvailabilityCount] = useState("2");
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleTag(value: string) {
    setTags((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await authFetch("/profiles/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mentors_in: mentorsIn,
          background,
          background_tags: tags,
          other_tag_text: otherTagText || null,
          availability_count: parseInt(availabilityCount, 10) || 1,
          bio,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Failed (${res.status})`);
      }
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        What can you mentor in?
        <input
          required
          placeholder="e.g. transitioning into product management"
          value={mentorsIn}
          onChange={(e) => setMentorsIn(e.target.value)}
          className="rounded border px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        Your background/path
        <textarea
          required
          rows={3}
          placeholder="How you got to where you are now"
          value={background}
          onChange={(e) => setBackground(e.target.value)}
          className="rounded border px-3 py-2"
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">
          Anything here part of your own path? (optional)
        </legend>
        <div className="flex flex-wrap gap-2">
          {CIRCUMSTANCE_TAGS.map((tag) => (
            <label
              key={tag.value}
              className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${
                tags.includes(tag.value) ? "border-black bg-gray-50 font-medium" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={tags.includes(tag.value)}
                onChange={() => toggleTag(tag.value)}
                className="sr-only"
              />
              {tag.label}
            </label>
          ))}
        </div>
        <input
          placeholder="Other (optional)"
          value={otherTagText}
          onChange={(e) => setOtherTagText(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
        />
      </fieldset>

      <label className="flex flex-col gap-1.5 text-sm">
        How many mentees are you open to?
        <input
          type="number"
          min={1}
          max={50}
          required
          value={availabilityCount}
          onChange={(e) => setAvailabilityCount(e.target.value)}
          className="w-24 rounded border px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        Short bio
        <textarea
          required
          rows={4}
          placeholder="A little about you, for mentees deciding whether to reach out"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="rounded border px-3 py-2"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}
