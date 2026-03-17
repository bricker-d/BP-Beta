"use client";

import Link from "next/link";
import { Biomarker, LabPanel } from "@/lib/types";
import { STATUS_COLORS } from "@/lib/biomarkers";
import { formatDate } from "@/lib/utils";

interface LabPanelCardProps {
  panel: LabPanel;
}

function BiomarkerItem({ marker }: { marker: Biomarker }) {
  const { dot } = STATUS_COLORS[marker.status];
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-semibold text-text-secondary tracking-wide uppercase">
          {marker.shortName}
        </span>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
      </div>
      <span className="text-[26px] font-bold text-text-primary leading-tight mt-0.5">
        {marker.value}
      </span>
      <span className="text-[12px] text-text-muted">{marker.unit}</span>
    </div>
  );
}

export default function LabPanelCard({ panel }: LabPanelCardProps) {
  const displayMarkers = panel.biomarkers.slice(0, 4);

  return (
    <div>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h2 className="text-[17px] font-bold text-text-primary">Lab Panel</h2>
          <p className="text-[13px] text-text-secondary mt-0.5">Comprehensive biomarker analysis</p>
        </div>
        <Link
          href="/lab-results"
          className="text-[13px] font-semibold text-blue-500 active:opacity-70"
        >
          View Details
        </Link>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-card">
        {/* Panel meta */}
        <div className="flex justify-between mb-4 pb-4 border-b border-gray-100">
          <div>
            <p className="text-[12px] text-text-muted">Latest Panel</p>
            <p className="text-[14px] font-semibold text-text-primary mt-0.5">
              {formatDate(panel.date)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[12px] text-text-muted">Total Markers</p>
            <p className="text-[14px] font-semibold text-text-primary mt-0.5">
              {panel.biomarkers.length} biomarkers
            </p>
          </div>
        </div>

        {/* Biomarker grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
          {displayMarkers.map((marker) => (
            <BiomarkerItem key={marker.id} marker={marker} />
          ))}
        </div>
      </div>
    </div>
  );
}
