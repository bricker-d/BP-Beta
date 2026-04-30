"use client";

import { User } from "lucide-react";
import { useHealthStore } from "@/store/useHealthStore";

interface HeaderProps {
  showProfile?: boolean;
  title?: string;
  onBack?: () => void;
}

export default function Header({ showProfile = true, title, onBack }: HeaderProps) {
  const user = useHealthStore((s) => s.user);

  return (
    <header
      className="flex items-center justify-between px-5 py-4"
      style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-2.5">
        {onBack ? (
          <button onClick={onBack} className="p-1 -ml-1" style={{ color: "var(--text1)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
        ) : (
          <>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #9333ea, #6366f1)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M2 12h3l3-8 3 16 3-10 3 5 2-3h3" />
              </svg>
            </div>
            <span className="text-[17px] font-semibold tracking-tight" style={{ color: "var(--text1)" }}>
              BioPrecision
            </span>
          </>
        )}
        {title && (
          <span className="text-[17px] font-semibold" style={{ color: "var(--text1)" }}>{title}</span>
        )}
      </div>

      {showProfile && !onBack && (
        <button
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{ background: "var(--surface)" }}
        >
          <User size={16} color="var(--text2)" />
        </button>
      )}
    </header>
  );
}
