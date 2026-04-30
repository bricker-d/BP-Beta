"use client";

interface HeaderProps {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export default function Header({ title, onBack, right }: HeaderProps) {
  return (
    <header
      className="flex items-center justify-between px-5 py-4"
      style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} style={{ color: "var(--text2)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
        )}
        {title ? (
          <span className="text-[17px] font-semibold" style={{ color: "var(--text1)", letterSpacing: "-0.01em" }}>{title}</span>
        ) : (
          <span className="text-[17px] font-semibold" style={{ color: "var(--text1)", letterSpacing: "-0.02em" }}>BioPrecision</span>
        )}
      </div>
      {right && <div>{right}</div>}
    </header>
  );
}
