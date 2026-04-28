"use client";

import { useState } from "react";
import { useHealthStore } from "@/store/useHealthStore";
import Header from "@/components/layout/Header";
import LabUpload from "@/components/lab-results/LabUpload";
import BiomarkerList from "@/components/lab-results/BiomarkerList";
import { formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function LabResultsPage() {
  const { labPanel, actions, intakeProfile } = useHealthStore();
  const [view, setView] = useState<"upload" | "results">("results");
  const [generatingReport, setGeneratingReport] = useState(false);
  const router = useRouter();

  async function downloadReport() {
    if (!labPanel) return;
    setGeneratingReport(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labPanel,
          actions,
          intakeProfile,
          patientName: intakeProfile?.name,
        }),
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
    <div className="page-content bg-background min-h-screen">
      <Header />

      <div className="px-5 pt-5 space-y-5">
        {/* Title */}
        <div>
          <h1 className="text-[22px] font-extrabold text-text-primary">
            Lab Results
          </h1>
          <p className="text-[13px] text-text-secondary mt-0.5">
            Upload and track your biomarkers
          </p>
        </div>

        {/* Report download */}
        {labPanel && (
          <button
            onClick={downloadReport}
            disabled={generatingReport}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 font-semibold text-sm disabled:opacity-50"
          >
            {generatingReport ? "Generating report..." : "📄 Download Clinical Report"}
          </button>
        )}

        {/* Toggle tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => setView("results")}
            className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all ${
              view === "results"
                ? "bg-white text-text-primary shadow-sm"
                : "text-text-muted"
            }`}
          >
            Current Results
          </button>
          <button
            onClick={() => setView("upload")}
            className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all ${
              view === "upload"
                ? "bg-white text-text-primary shadow-sm"
                : "text-text-muted"
            }`}
          >
            Upload New
          </button>
        </div>

        {view === "upload" ? (
          <>
            <LabUpload />

            {/* Analyze button */}
            <button
              onClick={() => setView("results")}
              className="w-full gradient-btn text-white font-semibold text-[15px] py-4 rounded-2xl flex items-center justify-center gap-2 active:opacity-90 shadow-card-lg"
            >
              Analyze Results
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </>
        ) : (
          <>
            {/* Panel meta */}
            {labPanel && (
              <div className="flex items-center justify-between text-[13px]">
                <div>
                  <span className="text-text-muted">Last updated: </span>
                  <span className="font-semibold text-text-primary">
                    {formatDate(labPanel.date)}
                  </span>
                </div>
                <span className="text-text-muted">{labPanel.source}</span>
              </div>
            )}

            {/* Biomarker list */}
            {labPanel ? (
              <BiomarkerList biomarkers={labPanel.biomarkers} />
            ) : (
              <div className="text-center py-12">
                <p className="text-text-muted text-[14px]">No results yet</p>
                <button
                  onClick={() => setView("upload")}
                  className="mt-3 text-purple-500 font-semibold text-[14px]"
                >
                  Upload your first lab report
                </button>
              </div>
            )}

            {/* Analyze with AI */}
            <button
              onClick={() => router.push("/coach")}
              className="w-full gradient-btn text-white font-semibold text-[15px] py-4 rounded-2xl flex items-center justify-center gap-2 active:opacity-90 shadow-card-lg"
            >
              Discuss with AI Coach
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
