"use client";

import { DayLog } from "@/store/useHealthStore";

interface Props {
  history: DayLog[];
  streak: number;
}

function getDays(count: number): string[] {
  const days: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export default function CompletionCalendar({ history, streak }: Props) {
  const days = getDays(35); // 5 weeks
  const logMap = new Map(history.map(d => [d.date, d]));
  const today = new Date().toISOString().split("T")[0];

  // Pad so first day aligns to its weekday
  const firstDow = new Date(days[0]).getDay(); // 0=Sun

  return (
    <div className="rounded-2xl px-4 py-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-semibold" style={{ color: "var(--text1)" }}>Consistency</p>
        {streak > 0 && (
          <span className="text-[12px] font-semibold" style={{ color: "#F59E0B" }}>
            {streak}-day streak
          </span>
        )}
      </div>

      {/* Day-of-week labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((l, i) => (
          <div key={i} className="text-center text-[9px] font-semibold uppercase"
            style={{ color: "var(--text3)" }}>
            {l}
          </div>
        ))}
      </div>

      {/* Calendar grid — pad first row */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map(date => {
          const log = logMap.get(date);
          const isToday = date === today;
          const isFuture = date > today;

          let bg = "var(--border)";
          let opacity = 1;

          if (!isFuture && log) {
            const ratio = log.total > 0 ? log.completed / log.total : 0;
            if (ratio === 1) bg = "var(--green)";
            else if (ratio >= 0.5) bg = "#F59E0B";
            else if (ratio > 0) bg = "rgba(245,158,11,0.4)";
            else bg = "rgba(220,38,38,0.25)";
          } else if (isFuture) {
            opacity = 0.2;
          }

          return (
            <div
              key={date}
              title={log ? `${log.completed}/${log.total} completed` : date}
              className="aspect-square rounded-sm"
              style={{
                background: bg,
                opacity,
                outline: isToday ? "2px solid var(--accent)" : "none",
                outlineOffset: "1px",
              }}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3">
        {[
          { color: "var(--green)", label: "All done" },
          { color: "#F59E0B", label: "Partial" },
          { color: "var(--border)", label: "None" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
            <span className="text-[10px]" style={{ color: "var(--text3)" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
