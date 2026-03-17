"use client";

import { AlertCircle, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";

interface AlertCardProps {
  outOfRangeCount: number;
}

export default function AlertCard({ outOfRangeCount }: AlertCardProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push("/lab-results")}
      className="w-full text-left bg-[#FFF7ED] rounded-2xl p-4 flex items-start gap-3.5 active:scale-[0.98] transition-transform"
    >
      {/* Icon */}
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center mt-0.5">
        <AlertCircle size={20} className="text-orange-500" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-bold text-text-primary leading-snug">
          {outOfRangeCount} Biomarkers Outside Optimal Range
        </p>
        <p className="text-[13px] text-text-secondary mt-1 leading-relaxed">
          Your daily actions target these limiting factors. Tap to view detailed analysis.
        </p>
      </div>

      {/* Trend icon */}
      <TrendingUp size={18} className="text-text-muted flex-shrink-0 mt-1" />
    </button>
  );
}
