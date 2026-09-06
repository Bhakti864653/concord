// Mirrors backend/app/matching.py's _tokenize/explain_match - kept in sync
// by hand since this is the one place the dashboard needs the same
// explainable-match reasoning without a round trip through the backend
// (the dashboard already has both profiles in hand from its own direct
// Supabase reads).
const STOPWORDS = new Set([
  "a", "an", "the", "in", "on", "of", "to", "into", "for", "with", "and",
  "or", "my", "your", "i", "am", "is", "are", "be", "as", "at", "from",
]);

function tokenize(...texts: (string | null | undefined)[]): Set<string> {
  const words = new Set<string>();
  for (const text of texts) {
    if (!text) continue;
    for (const word of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
      if (!STOPWORDS.has(word)) words.add(word);
    }
  }
  return words;
}

export function matchReasons(
  aText: string | null | undefined,
  aOther: string | null | undefined,
  aTags: string[],
  bText: string | null | undefined,
  bOther: string | null | undefined,
  bTags: string[],
): { sharedWords: string[]; sharedTags: string[] } {
  const aWords = tokenize(aText, aOther);
  const bWords = tokenize(bText, bOther);
  const sharedWords = [...aWords].filter((w) => bWords.has(w)).sort();
  const bTagSet = new Set(bTags);
  const sharedTags = aTags.filter((t) => bTagSet.has(t)).sort();
  return { sharedWords, sharedTags };
}
