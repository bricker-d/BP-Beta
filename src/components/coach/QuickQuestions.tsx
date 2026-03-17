"use client";

import { Sparkles } from "lucide-react";

const QUESTIONS = [
  "Why is my glucose elevated?",
  "What should I focus on?",
  "How to improve HRV?",
  "Explain my labs",
];

interface QuickQuestionsProps {
  onSelect: (q: string) => void;
}

export default function QuickQuestions({ onSelect }: QuickQuestionsProps) {
  return (
    <div className="px-4 pb-3">
      <p className="text-[11px] font-semibold text-text-muted tracking-widest uppercase mb-2">
        Quick Questions
      </p>
      <div className="grid grid-cols-2 gap-2">
        {QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="bg-white rounded-xl p-3 text-left flex items-start gap-2 shadow-card active:scale-[0.97] transition-transform border border-gray-100"
          >
            <Sparkles size={13} className="text-purple-400 flex-shrink-0 mt-0.5" />
            <span className="text-[12px] font-medium text-text-primary leading-snug">
              {q}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
