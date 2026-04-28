"use client";

import { useEffect, useState } from "react";
import { getPatientOverview } from "@/lib/supabase";

interface PatientRow {
  id: string;
  name: string | null;
  primary_focus: string | null;
  age: number | null;
  biological_sex: string | null;
  latest_panel_date: string | null;
  total_biomarkers: number | null;
  weekly_completion_pct: number | null;
  days_since_checkin: number | null;
  created_at: string;
}

function badge(label: string, color: string) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {label}
    </span>
  );
}

function completionColor(pct: number | null) {
  if (pct === null) return "bg-gray-100 text-gray-500";
  if (pct >= 80) return "bg-green-100 text-green-700";
  if (pct >= 50) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

function checkinStatus(days: number | null) {
  if (days === null) return badge("Never", "bg-gray-100 text-gray-500");
  if (days === 0) return badge("Today", "bg-green-100 text-green-700");
  if (days === 1) return badge("Yesterday", "bg-blue-100 text-blue-700");
  if (days <= 3) return badge(`${days}d ago`, "bg-yellow-100 text-yellow-700");
  return badge(`${days}d ago`, "bg-red-100 text-red-700");
}

export default function ClinicianDashboard() {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getPatientOverview()
      .then((data) => setPatients(data as PatientRow[]))
      .catch(() => setError("Failed to load patients. Check Supabase env vars."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-gray-900">Frame Longevity</h1>
          <p className="text-sm text-gray-500 mt-1">BioPrecision Patient Dashboard</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Patients", value: patients.length },
            { label: "Checked In Today", value: patients.filter(p => p.days_since_checkin === 0).length },
            { label: "Avg Completion", value: patients.length ? Math.round(patients.reduce((s, p) => s + (p.weekly_completion_pct ?? 0), 0) / patients.length) + "%" : "—" },
            { label: "Need Attention", value: patients.filter(p => (p.days_since_checkin ?? 99) > 3).length },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Patient table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">All Patients</h2>
          </div>

          {loading && (
            <div className="p-12 text-center text-gray-400 text-sm">Loading patients...</div>
          )}

          {error && (
            <div className="p-12 text-center text-red-500 text-sm">{error}</div>
          )}

          {!loading && !error && patients.length === 0 && (
            <div className="p-12 text-center text-gray-400 text-sm">
              No patients yet. They'll appear here once they complete onboarding.
            </div>
          )}

          {!loading && patients.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-6 py-3 text-left">Patient</th>
                  <th className="px-6 py-3 text-left">Primary Focus</th>
                  <th className="px-6 py-3 text-left">Latest Panel</th>
                  <th className="px-6 py-3 text-left">7-Day Completion</th>
                  <th className="px-6 py-3 text-left">Last Check-in</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p, i) => (
                  <tr key={p.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{p.name ?? "Anonymous"}</p>
                      <p className="text-xs text-gray-400">
                        {p.age ? `${p.age} · ` : ""}{p.biological_sex ?? ""}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600 capitalize">
                        {p.primary_focus?.replace(/_/g, " ") ?? "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {p.latest_panel_date ? (
                        <span className="text-gray-600">
                          {new Date(p.latest_panel_date).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">No labs</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {badge(
                        p.weekly_completion_pct !== null ? `${p.weekly_completion_pct}%` : "No data",
                        completionColor(p.weekly_completion_pct)
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {checkinStatus(p.days_since_checkin)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-4 text-center">
          BioPrecision · Frame Longevity · Data updates in real time
        </p>
      </div>
    </div>
  );
}
