// Nothing in mentee_profiles/mentor_profiles stores a real name (by design -
// see MatchIdentity's comment), so the "avatar" is a monogram derived from
// the person's own topic text (what they mentor in / seek guidance on)
// rather than fabricating or requesting a name field.
export function initialsFrom(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const SIZE_CLASSES = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-lg",
} as const;

export default function InitialAvatar({
  label,
  role,
  size = "md",
}: {
  label: string;
  role: "mentee" | "mentor";
  size?: keyof typeof SIZE_CLASSES;
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-display font-bold text-paper-raised ${SIZE_CLASSES[size]} ${
        role === "mentee" ? "bg-mentee" : "bg-mentor"
      }`}
    >
      {initialsFrom(label)}
    </span>
  );
}
