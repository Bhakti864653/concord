/**
 * Day-granularity relative label ("today"/"yesterday"/"3 days ago"), falling
 * back to a short date past a week out. Deliberately coarse - good enough
 * for "when did the last message/note happen," not a precision timestamp.
 */
export function relativeDay(iso: string): string {
  const date = new Date(iso);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);

  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
