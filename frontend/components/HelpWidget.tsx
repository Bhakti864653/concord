"use client";

import { useState } from "react";
import { matchFaq } from "@/lib/helpFaq";

type Entry = { question: string; answer: string };

const INTRO: Entry = {
  question: "",
  answer:
    "Ask me how to use Concord - ranking preferences, matching, chat, scheduling, or notes.",
};

export default function HelpWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<Entry[]>([]);

  function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question) return;
    setHistory((prev) => [...prev, { question, answer: matchFaq(question) }]);
    setInput("");
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="concord-lift mb-3 w-80 overflow-hidden rounded-2xl border border-line bg-paper-raised">
          <div className="flex items-center justify-between bg-ink px-4 py-3">
            <span className="font-display text-sm font-semibold text-paper">Concord Help</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-paper/70 hover:text-paper"
            >
              Close
            </button>
          </div>
          <div className="flex max-h-72 flex-col gap-2 overflow-y-auto p-3">
            <p className="max-w-[85%] rounded-lg border border-line bg-paper px-3 py-2 text-xs leading-relaxed text-ink">
              {INTRO.answer}
            </p>
            {history.map((entry, i) => (
              <div key={i} className="flex flex-col gap-2">
                <p className="ml-auto max-w-[85%] rounded-lg border border-mentor bg-mentor-tint px-3 py-2 text-xs text-ink">
                  {entry.question}
                </p>
                <p className="max-w-[85%] rounded-lg border border-line bg-paper px-3 py-2 text-xs leading-relaxed text-ink">
                  {entry.answer}
                </p>
              </div>
            ))}
          </div>
          <form onSubmit={handleAsk} className="flex gap-2 border-t border-line p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about using Concord..."
              className="flex-1 rounded-md border border-line bg-paper px-2.5 py-1.5 text-xs text-ink focus:border-ink focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-md bg-ink px-3 py-1.5 text-xs font-semibold text-paper transition-opacity hover:opacity-90"
            >
              Ask
            </button>
          </form>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? "Close help" : "Open help"}
        className="ml-auto flex h-[52px] w-[52px] items-center justify-center rounded-full bg-ink font-display text-xl font-bold text-paper shadow-lg transition-opacity hover:opacity-90"
      >
        {open ? "×" : "?"}
      </button>
    </div>
  );
}
