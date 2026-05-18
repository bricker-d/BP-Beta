"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useHealthStore } from "@/store/useHealthStore";
import Header from "@/components/layout/Header";
import LabUpload from "@/components/lab-results/LabUpload";
import BiomarkerList from "@/components/lab-results/BiomarkerList";
import BiomarkerTrends from "@/components/lab-results/BiomarkerTrends";
import { formatDate, cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";

// Inner component that reads search params (must be inside Suspense)
function LabResultsContent() {
  const { labPanel, labHistory, actions, intakeProfile } = useHealthStore();
  const searchParams = useSearchParams();
  const forceUpload = searchParams.get("upload") === "1";
  const [view, setView] = useState<"upload" | "results" | "trends">(
    forceUpload || !labPanel ? "upload" : "results"
  );
  const [generatingReport, setGeneratingReport] = useState(false);
  const router = useRouter();

  // Only auto-switch to results when a NEW panel is uploaded (not on mount)
  const mountedPanelId = useRef(labPanel?.id ?? null);
  useEffect(() => {
    if (labPanel && labPanel.id !== mountedPanelId.current) {
      setView("results");
    }
  }, [labPanel]);

  async function downloadReport() {
    if (!labPanel) return;
    setGeneratingReport(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labPanel, actions, intakeProfile, patientName: intakeProfile?.name }),
      });
      const html = await res.text();
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `BioPrecision-Report-${new Date().toISOString().split("T")[0]}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGeneratingReport(false);
    }
  }

  return (
    <div className="page-content page-enter min-h-screen" style={{ background: "var(--bg)" }}>
      <Header />

      <div className="px-5 pt-5 space-y-5">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.02em" }}>Lab Results</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--text2)" }}>Upload and track your biomarkers</p>
        </div>

        {labPanel && (
          <button
            onClick={downloadReport}
            disabled={generatingReport}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-[13px] font-semibold disabled:opacity-50"
            style={{ background: "var(--accent-lo)", color: "var(--accent)", border: "1px solid var(--accent-mid)" }}
          >
            {generatingReport ? "Generating..." : "Download Clinical Report"}
          </button>
        )}

        {/* Tab bar */}
        <div className="flex rounded-xl p-1 gap-1" style={{ background: "var(--surface2)" }}>
          <TabBtn active={view === "results"} onClick={() => setView("results")} label="Current Results" />
          {labHistory && labHistory.length >= 2 && (
            <TabBtn active={view === "trends"} onClick={() => setView("trends")} label={`Trends (${labHistory.length})`} />
          )}
          <TabBtn active={view === "upload"} onClick={() => setView("upload")} label="Upload New" />
        </div>

        {view === "upload" ? (
          <div className="step-enter space-y-4">
            <LabUpload />
          </div>
        ) : (
          <div className="step-enter space-y-4">
            {labPanel && (
              <div className="flex items-center justify-between text-[13px]">
                <span style={{ color: "var(--text2)" }}>
                  Last updated: <span className="font-semibold" style={{ color: "var(--text1)" }}>{formatDate(labPanel.date)}</span>
                </span>
                <span style={{ color: "var(--text3)" }}>{labPanel.source}</span>
              </div>
            )}

            {view === "trends" && labHistory && labHistory.length >= 2 ? (
              <BiomarkerTrends labHistory={labHistory} />
            ) : labPanel ? (
              <BiomarkerList biomarkers={labPanel.biomarkers} />
            ) : (
              <div className="text-center py-16">
                <p className="text-[15px] font-semibold" style={{ color: "var(--text1)" }}>No results uploaded yet</p>
                <p className="text-[13px] mt-1" style={{ color: "var(--text2)" }}>Upload a PDF from Quest, LabCorp, or your doctor</p>
                <button onClick={() => setView("upload")} className="mt-4 text-[14px] font-semibold" style={{ color: "var(--accent)" }}>
                  Upload labs
                </button>
              </div>
            )}

            {labPanel && (
              <button
                onClick={() => router.push("/coach")}
                className="btn-primary"
              >
                Discuss with AI Coach
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all"
      style={{
        background: active ? "var(--surface)" : "transparent",
        color: active ? "var(--text1)" : "var(--text3)",
        boxShadow: active ? "0 1px 3px rgba(0,0,0,0.07)" : "none",
      }}
    >
      {label}
    </button>
  );
}

export default function LabResultsPage() {
  return (
    <Suspense fallback={
      <div className="page-content min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
      </div>
    }>
      <LabResultsContent />
    </Suspense>
  );
}
