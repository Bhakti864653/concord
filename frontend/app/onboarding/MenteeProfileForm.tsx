"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/authFetch";
import { CIRCUMSTANCE_TAGS } from "@/lib/tags";

export default function MenteeProfileForm() {
  const router = useRouter();
  const [seekingGuidanceOn, setSeekingGuidanceOn] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [otherTagText, setOtherTagText] = useState("");
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
      const res = await authFetch("/profiles/mentee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seeking_guidance_on: seekingGuidanceOn,
          circumstance_tags: tags,
          other_tag_text: otherTagText || null,
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
      <label className="flex flex-col gap-1.5 text-sm text-ink">
        What are you seeking guidance on?
        <input
          required
          placeholder="e.g. breaking into product management"
          value={seekingGuidanceOn}
          onChange={(e) => setSeekingGuidanceOn(e.target.value)}
          className="rounded-md border border-line bg-paper px-3 py-2 focus:border-mentee focus:outline-none"
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-ink">
          Anything here apply to you? (optional)
        </legend>
        <div className="flex flex-wrap gap-2">
          {CIRCUMSTANCE_TAGS.map((tag) => (
            <label
              key={tag.value}
              className={`cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors ${
                tags.includes(tag.value)
                  ? "border-mentee bg-mentee-tint font-medium text-ink"
                  : "border-line text-muted"
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
          className="rounded-md border border-line bg-paper px-3 py-2 text-sm focus:border-mentee focus:outline-none"
        />
      </fieldset>

      <label className="flex flex-col gap-1.5 text-sm text-ink">
        Short bio
        <textarea
          required
          rows={4}
          placeholder="A little about you and what you're hoping to get out of mentorship"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="rounded-md border border-line bg-paper px-3 py-2 focus:border-mentee focus:outline-none"
        />
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-mentee px-3 py-2 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}
