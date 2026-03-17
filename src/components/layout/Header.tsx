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
    <header className="flex items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
      <div className="flex items-center gap-2.5">
        {onBack ? (
          <button onClick={onBack} className="p-1 -ml-1 text-text-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
        ) : (
          <>
            {/* Logo mark */}
            <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M2 12h3l3-8 3 16 3-10 3 5 2-3h3" />
              </svg>
            </div>
            <span className="text-[17px] font-semibold text-text-primary tracking-tight">
              BioPrecision
            </span>
          </>
        )}
        {title && (
          <span className="text-[17px] font-semibold text-text-primary">{title}</span>
        )}
      </div>

      {showProfile && !onBack && (
        <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-text-secondary hover:bg-gray-200 transition-colors">
          <User size={18} />
        </button>
      )}
    </header>
  );
}
