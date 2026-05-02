"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { HealthAction } from "@/lib/types";

const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  Movement:   { color: "#F59E0B", bg: "rgba(245,158,11,0.1)"  },
  Nutrition:  { color: "#10B981", bg: "rgba(16,185,129,0.1)"  },
  Exercise:   { color: "#3B82F6", bg: "rgba(59,130,246,0.1)"  },
  Sleep:      { color: "#8B5CF6", bg: "rgba(139,92,246,0.1)"  },
  Supplement: { color: "#EC4899", bg: "rgba(236,72,153,0.1)"  },
  Lifestyle:  { color: "#6366F1", bg: "rgba(99,102,241,0.1)"  },
};

interface ActionCardProps {
  action: HealthAction;
  onToggle: (id: string) => void;
}

export default function ActionCard({ action, onToggle }: ActionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORY_COLORS[action.category] ?? { color: "var(--accent)", bg: "var(--accent-lo)" };

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 18,
      opacity: action.completed ? 0.5 : 1,
      transition: "opacity 0.2s",
    }}>
      <div className="flex items-center gap-3 px-4 py-4">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(action.id)}
          className="flex-shrink-0"
          style={{
            width: 24, height: 24, borderRadius: "50%",
            border: action.completed ? "none" : "2px solid var(--border)",
            background: action.completed ? "var(--green)" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {action.completed && (
            <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
              <path d="M1 4.5l3 3 6-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold leading-snug"
            style={{ color: "var(--text1)", textDecoration: action.completed ? "line-through" : "none" }}>
            {action.title}
          </p>
          {action.biomarkerTarget && (
            <p className="text-[11px] mt-0.5 font-medium" style={{ color: "var(--accent)" }}>
              {action.biomarkerTarget}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: cat.bg, color: cat.color }}>
            {action.category}
          </span>
          <button onClick={() => setExpanded(e => !e)} style={{ color: "var(--text3)", display: "flex" }}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-0">
          <div className="pt-3" style={{ borderTop: "1px solid var(--border)" }}>
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--text2)" }}>
              {action.why}
            </p>
            {action.citations && action.citations.length > 0 && (
              <p className="text-[11px] mt-2" style={{ color: "var(--text3)", lineHeight: 1.5 }}>
                {typeof action.citations[0] === "string" ? action.citations[0] : ""}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
