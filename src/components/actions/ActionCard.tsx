"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { HealthAction } from "@/lib/types";
import { CATEGORY_COLORS } from "@/lib/biomarkers";
import { cn } from "@/lib/utils";

interface ActionCardProps {
  action: HealthAction;
  onToggle: (id: string) => void;
}

export default function ActionCard({ action, onToggle }: ActionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const colors = CATEGORY_COLORS[action.category] ?? { bg: "bg-gray-400", text: "text-white" };

  return (
    <div
      className={cn(
        "bg-white rounded-2xl p-4 shadow-card transition-all",
        action.completed && "opacity-70"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(action.id)}
          className={cn(
            "w-6 h-6 rounded-full border-2 flex-shrink-0 mt-0.5 transition-all flex items-center justify-center",
            action.completed
              ? "border-green-500 bg-green-500"
              : "border-gray-300 bg-white"
          )}
        >
          {action.completed && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-[15px] font-bold text-text-primary leading-snug",
              action.completed && "line-through text-text-muted"
            )}
          >
            {action.title}
          </p>
          <p className="text-[13px] text-text-secondary mt-0.5">
            {action.description}
          </p>

          {/* Footer row */}
          <div className="flex items-center gap-2.5 mt-3">
            <span
              className={cn(
                "text-[12px] font-semibold px-3 py-1 rounded-full",
                colors.bg,
                colors.text
              )}
            >
              {action.category}
            </span>

            <button
              onClick={() => setExpanded((e) => !e)}
              className="flex items-center gap-1 text-[12px] text-text-secondary font-medium active:text-text-primary"
            >
              Why this works
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>

          {/* Expanded why */}
          {expanded && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-[13px] text-text-secondary leading-relaxed">
                {action.why}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
