"use client";

import { useEffect, useState } from "react";
import { getPatientOverview, getCohortOutcomes, BiomarkerOutcome } from "@/lib/supabase";
import { TrendingUp, TrendingDown, Minus, Download, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function pill(label: string, cls: string) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function completionClass(pct: number | null) {
  if (pct === null) return "bg-gray-100 text-gray-500";
  if (pct >= 80) return "bg-green-100 text-green-700";
  if (pct >= 50) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

function checkinLabel(days: number | null) {
  if (days === null) return { text: "Never",     cls: "bg-gray-100 text-gray-500"   };
  if (days === 0)    return { text: "Today",     cls: "bg-green-100 text-green-700"  };
  if (days === 1)    return { text: "Yesterday", cls: "bg-blue-100 text-blue-700"    };
  if (days <= 3)     return { text: `${days}d ago`, cls: "bg-yellow-100 text-yellow-700" };
  return             { text: `${days}d ago`, cls: "bg-red-100 text-red-700"     };
}

// ── Cohort outcomes section ───────────────────────────────────────────────────

function CohortOutcomes({ outcomes }: { outcomes: BiomarkerOutcome[] }) {
  if (!outcomes.length) return null;

  const topImproved = outcomes.filter(o => o.improved > 0).slice(0, 6);
  const topWatch    = outcomes.filter(o => o.worsened > o.improved).slice(0, 4);

  return (
    <div className="mb-8 grid grid-cols-2 gap-6">
      {/* Most improved */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <TrendingUp size={14} className="text-emerald-500" />
          <h3 className="text-sm font-semibold text-gray-700">Most Improved Biomarkers</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {topImproved.map(o => {
            const rate = Math.round((o.improved / o.totalPatients) * 100);
            return (
              <div key={o.biomarkerId} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{o.biomarkerName}</p>
                  <p className="text-xs text-gray-400">{o.totalPatients} patients tracked</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-emerald-600">{rate}%</p>
                  <p className="text-xs text-gray-400">improved</p>
                </div>
                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${rate}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Worth watching */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <TrendingDown size={14} className="text-red-400" />
          <h3 className="text-sm font-semibold text-gray-700">Worth Discussing at Review</h3>
        </div>
        {topWatch.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            Not enough multi-panel data yet
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {topWatch.map(o => {
              const worsenRate = Math.round((o.worsened / o.totalPatients) * 100);
              return (
                <div key={o.biomarkerId} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{o.biomarkerName}</p>
                    <p className="text-xs text-gray-400">{o.totalPatients} patients tracked</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-red-500">{worsenRate}%</p>
                    <p className="text-xs text-gray-400">worsened</p>
                  </div>
                  <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                    <div className="h-full bg-red-300 rounded-full" style={{ width: `${worsenRate}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Patient detail row ────────────────────────────────────────────────────────

function PatientDetailRow({ p }: { p: PatientRow }) {
  const [open, setOpen] = useState(false);
  const ci = checkinLabel(p.days_since_checkin);

  return (
    <>
      <tr
        className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={() => setOpen(o => !o)}
      >
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
              {(p.name ?? "?")[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{p.name ?? "Anonymous"}</p>
              <p className="text-xs text-gray-400">
                {p.age ? `${p.age}` : ""}{p.biological_sex ? ` · ${p.biological_sex}` : ""}
              </p>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 text-gray-600 capitalize">
          {p.primary_focus?.replace(/_/g, " ") ?? "—"}
        </td>
        <td className="px-6 py-4 text-gray-600">
          {p.latest_panel_date ? new Date(p.latest_panel_date).toLocaleDateString() : (
            <span className="text-gray-400">No labs</span>
          )}
        </td>
        <td className="px-6 py-4">
          {pill(
            p.weekly_completion_pct !== null ? `${p.weekly_completion_pct}%` : "No data",
            completionClass(p.weekly_completion_pct)
          )}
        </td>
        <td className="px-6 py-4">
          {pill(ci.text, ci.cls)}
        </td>
        <td className="px-6 py-4">
          {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </td>
      </tr>
      {open && (
        <tr className="bg-gray-50 border-b border-gray-100">
          <td colSpan={6} className="px-6 py-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Protocol adherence</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{ width: `${p.weekly_completion_pct ?? 0}%` }}
                    />
                  </div>
                  <span className="text-gray-600 font-semibold">{p.weekly_completion_pct ?? 0}%</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">7-day average</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Lab data</p>
                <p className="text-gray-700">{p.total_biomarkers ?? 0} biomarkers tracked</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {p.latest_panel_date ? `Last panel ${new Date(p.latest_panel_date).toLocaleDateString()}` : "No panel uploaded"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Enrolled</p>
                <p className="text-gray-700">{new Date(p.created_at).toLocaleDateString()}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000)} days on protocol
                </p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ClinicianDashboard() {
  const [patients,  setPatients]  = useState<PatientRow[]>([]);
  const [outcomes,  setOutcomes]  = useState<BiomarkerOutcome[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [reporting, setReporting] = useState(false);
  const [filter,    setFilter]    = useState<"all" | "attention">("all");

  async function load() {
    setLoading(true);
    try {
      const [p, o] = await Promise.all([getPatientOverview(), getCohortOutcomes()]);
      setPatients(p as PatientRow[]);
      setOutcomes(o);
    } catch {
      setError("Failed to load data. Check Supabase env vars.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function downloadReport() {
    setReporting(true);
    try {
      const res = await fetch("/api/cohort-report", { method: "POST" });
      const html = await res.text();
      const blob = new Blob([html], { type: "text/html" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `BioPrecision-Cohort-${new Date().toISOString().split("T")[0]}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setReporting(false);
    }
  }

  const visible = filter === "attention"
    ? patients.filter(p => (p.days_since_checkin ?? 99) > 3)
    : patients;

  const stats = [
    { label: "Total Patients",    value: patients.length },
    { label: "Checked In Today",  value: patients.filter(p => p.days_since_checkin === 0).length },
    { label: "Avg Completion",    value: patients.length ? Math.round(patients.reduce((s, p) => s + (p.weekly_completion_pct ?? 0), 0) / patients.length) + "%" : "—" },
    { label: "Need Attention",    value: patients.filter(p => (p.days_since_checkin ?? 99) > 3).length },
    { label: "Biomarker Panels",  value: outcomes.reduce((s, o) => Math.max(s, o.totalPatients), 0) > 0 ? `${outcomes.reduce((s, o) => Math.max(s, o.totalPatients), 0)} tracked` : "—" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Frame Longevity</h1>
            <p className="text-sm text-gray-500 mt-1">BioPrecision Patient Dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={downloadReport}
              disabled={reporting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
            >
              <Download size={13} />
              {reporting ? "Generating..." : "Download Report"}
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Cohort outcomes */}
        {outcomes.length > 0 && <CohortOutcomes outcomes={outcomes} />}

        {/* Patient table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">All Patients</h2>
            <div className="flex items-center gap-2">
              {[
                { id: "all",       label: "All" },
                { id: "attention", label: `Needs attention (${patients.filter(p => (p.days_since_checkin ?? 99) > 3).length})` },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id as "all" | "attention")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    filter === f.id
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="p-12 text-center text-gray-400 text-sm">Loading patients...</div>
          )}
          {error && (
            <div className="p-12 text-center text-red-500 text-sm">{error}</div>
          )}
          {!loading && !error && visible.length === 0 && (
            <div className="p-12 text-center text-gray-400 text-sm">
              {filter === "attention" ? "No patients need attention right now." : "No patients yet. They'll appear here once they complete onboarding."}
            </div>
          )}

          {!loading && visible.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-6 py-3 text-left">Patient</th>
                  <th className="px-6 py-3 text-left">Primary Focus</th>
                  <th className="px-6 py-3 text-left">Latest Panel</th>
                  <th className="px-6 py-3 text-left">7-Day Completion</th>
                  <th className="px-6 py-3 text-left">Last Check-In</th>
                  <th className="px-6 py-3 text-left"></th>
                </tr>
              </thead>
              <tbody>
                {visible.map(p => <PatientDetailRow key={p.id} p={p} />)}
              </tbody>
            </table>
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={11} className="text-emerald-500" /> Improving
          </div>
          <div className="flex items-center gap-1.5">
            <Minus size={11} /> Stable
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingDown size={11} className="text-red-400" /> Worsened
          </div>
          <span className="ml-auto">BioPrecision · Frame Longevity · Real-time data</span>
        </div>

      </div>
    </div>
  );
}
