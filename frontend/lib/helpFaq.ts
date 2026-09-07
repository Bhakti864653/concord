/**
 * Deliberately not an LLM call - this only answers "how do I use Concord"
 * questions, matched by keyword against a fixed list. It should never be
 * mistaken for the real mentor/mentee conversation, which lives in chat.
 */
export type FaqEntry = {
  keywords: string[];
  answer: string;
};

export const FAQ_ENTRIES: FaqEntry[] = [
  {
    keywords: ["rank", "preference", "prioriti"],
    answer:
      "Go to \"Preferences ranked\" on your dashboard path (or open Preferences directly) - reorder the list with the Up/Down buttons, then lock it in when you're ready.",
  },
  {
    keywords: ["match", "paired"],
    answer:
      "Matching runs once enough people have locked in preferences. Watch the \"Matched!\" step on your path - it lights up and you'll get a notification the moment it happens.",
  },
  {
    keywords: ["chat", "message", "talk"],
    answer:
      "Once you're matched, open the Chat tab on your match page. Messages appear live on both sides - no refresh needed.",
  },
  {
    keywords: ["schedul", "availab", "time", "calendar"],
    answer:
      "On your match page, open the Availability tab and mark the days/times you're generally free. Any slot you both marked shows as \"Both free.\"",
  },
  {
    keywords: ["note"],
    answer:
      "The Notes tab on your match page is shared - either of you can add a note, and you'll both see the full history, newest first.",
  },
  {
    keywords: ["notif", "bell"],
    answer:
      "The bell icon on your dashboard shows a badge for unread updates - new matches and new messages both notify you there.",
  },
  {
    keywords: ["profile", "bio"],
    answer:
      "Your profile is what the other side sees once you're matched. You set it up once, right after signing up.",
  },
];

export const FAQ_FALLBACK =
  "I can only help with using Concord itself - try asking about ranking preferences, matching, chat, scheduling, or notes.";

export function matchFaq(question: string): string {
  const q = question.toLowerCase();
  const hit = FAQ_ENTRIES.find((entry) => entry.keywords.some((k) => q.includes(k)));
  return hit?.answer ?? FAQ_FALLBACK;
}
