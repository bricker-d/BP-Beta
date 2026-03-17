"use client";

import { useState } from "react";
import { useHealthStore } from "@/store/useHealthStore";
import Header from "@/components/layout/Header";
import LabUpload from "@/components/lab-results/LabUpload";
import BiomarkerList from "@/components/lab-results/BiomarkerList";
import { formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function LabResultsPage() {
  const { labPanel } = useHealthStore();
  const [view, setView] = useState<"upload" | "results">("results");
  const router = useRouter();

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
