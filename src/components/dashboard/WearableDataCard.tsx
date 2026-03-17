"use client";

import { RefreshCw, TrendingUp } from "lucide-react";
import { WearableData } from "@/lib/types";

interface WearableDataCardProps {
  data: WearableData;
}

interface MetricRowProps {
  label: string;
  value: string;
  trend?: { value: number; positive: boolean } | null;
}

function MetricRow({ label, value, trend }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-gray-50 last:border-0">
      <span className="text-[14px] text-text-secondary">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-[14px] font-bold text-text-primary">{value}</span>
        {trend && (
          <span
            className={`text-[11px] font-semibold flex items-center gap-0.5 ${
              trend.positive ? "text-green-500" : "text-red-500"
            }`}
          >
            <TrendingUp size={11} />
            {trend.positive ? "+" : ""}
            {trend.value}%
          </span>
        )}
      </div>
    </div>
  );
}

export default function WearableDataCard({ data }: WearableDataCardProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[17px] font-bold text-text-primary">Wearable Data</h2>
        <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-text-secondary active:bg-gray-200 transition-colors">
          <RefreshCw size={15} />
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-card">
        <p className="text-[11px] font-semibold text-text-muted tracking-widest uppercase mb-1">
          7-Day Average
        </p>

        <MetricRow
          label="Daily Steps"
          value={data.dailySteps.toLocaleString()}
        />
        <MetricRow
          label="Sleep Duration"
          value={`${data.sleepDuration} hrs`}
        />
        <MetricRow
          label="Resting Heart Rate"
          value={`${data.restingHeartRate} bpm`}
        />
        <MetricRow
          label="HRV (RMSSD)"
          value={`${data.hrv} ms`}
          trend={{ value: data.hrvTrend, positive: data.hrvTrend > 0 }}
        />

        <p className="text-[11px] text-text-muted mt-3">
          Synced from {data.source}
        </p>
      </div>
    </div>
  );
}
