const TAG_LABELS: Record<string, string> = {
  "first-gen": "first-gen",
  "career-switcher": "career-switcher",
  "immigrant-background": "immigrant background",
  "under-resourced-school-access": "under-resourced school access",
  other: "other",
};

/**
 * One conversation-starter line derived purely from the shared-word/tag
 * reasoning already computed by matchReasons() - used on both the match
 * overview and the chat header so the two don't drift into different
 * suggestions for the same pair.
 */
export function buildIcebreaker(reasons: { sharedWords: string[]; sharedTags: string[] }): string {
  if (reasons.sharedWords.length > 0) {
    return `You both mentioned "${reasons.sharedWords[0]}" - ask them about it.`;
  }
  if (reasons.sharedTags.length > 0) {
    const label = TAG_LABELS[reasons.sharedTags[0]] ?? reasons.sharedTags[0];
    return `You both share ${label} - that's a good place to start.`;
  }
  return "Ask them what got them started on this path.";
}
