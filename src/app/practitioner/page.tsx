"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { Plus, Search, RefreshCw, MessageSquare, AlertCircle, CheckCircle2, Clock } from "lucide-react";

interface PatientRow {
  id: string;
  name: string | null;
  age: number | null;
  biological_sex: string | null;
  goals: string[] | null;
  primary_focus: string | null;
  latest_panel_date: string | null;
  total_biomarkers: number | null;
  weekly_completion_pct: number | null;
  days_since_checkin: number | null;
  created_at: string;
  assigned_protocol?: string | null;
  unread_messages?: number;
}

function AdherenceRing({ pct }: { pct: number | null }) {
  const val = pct ?? 0;
  const r = 16, circ = 2 * Math.PI * r;
  const offset = circ - (val / 100) * circ;
  const color = val >= 80 ? "#10b981" : val >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0">
      <svg className="-rotate-90" width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={r} fill="none" stroke="#f3f4f6" strokeWidth="3.5" />
        <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="3.5"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className="absolute text-[9px] font-bold" style={{ color }}>
        {pct !== null ? `${Math.round(val)}` : "—"}
      </span>
    </div>
  );
}

function StatusDot({ days }: { days: number | null }) {
  if (days === null) return <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />;
  if (days === 0)    return <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />;
  if (days <= 1)     return <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />;
  if (days <= 3)     return <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />;
  return               <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />;
}

function lastSeenText(days: number | null) {
  if (days === null) return "Never checked in";
  if (days === 0)    return "Active today";
  if (days === 1)    return "Yesterday";
  return `${days}d ago`;
}

function PatientCard({ p, onClick }: { p: PatientRow; onClick: () => void }) {
  const needsAttention = (p.days_since_checkin ?? 99) > 3 || (p.weekly_completion_pct ?? 0) < 40;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border p-4 cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 relative"
      style={{ borderColor: needsAttention ? "rgba(239,68,68,0.2)" : "#f3f4f6" }}
    >
      {needsAttention && (
        <div className="absolute top-3 right-3">
          <AlertCircle size={14} className="text-red-400" />
        </div>
      )}

      {/* Top: avatar + name */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-sm font-bold text-emerald-700 flex-shrink-0">
          {(p.name ?? "?")[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{p.name ?? "Anonymous"}</p>
          <p className="text-xs text-gray-400">
            {[p.age && `${p.age}y`, p.biological_sex].filter(Boolean).join(" · ") || "No demographics"}
          </p>
        </div>
        {(p.unread_messages ?? 0) > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">
            <MessageSquare size={9} />
            {p.unread_messages}
          </span>
        )}
      </div>

      {/* Protocol */}
      <div className="mb-3">
        {p.assigned_protocol ? (
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0" />
            <p className="text-xs text-gray-600 truncate">{p.assigned_protocol}</p>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-600 font-medium">No protocol assigned</p>
          </div>
        )}
      </div>

      {/* Bottom row: adherence ring + last seen + labs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AdherenceRing pct={p.weekly_completion_pct} />
          <div>
            <p className="text-[10px] font-semibold text-gray-500">7-day adherence</p>
            <p className="text-[10px] text-gray-400">
              {p.weekly_completion_pct !== null ? `${Math.round(p.weekly_completion_pct)}% complete` : "No data yet"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5 justify-end mb-0.5">
            <StatusDot days={p.days_since_checkin} />
            <span className="text-[10px] text-gray-500">{lastSeenText(p.days_since_checkin)}</span>
          </div>
          <p className="text-[10px] text-gray-400">
            {p.total_biomarkers ? `${p.total_biomarkers} biomarkers` : "No labs"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PractitionerDashboard() {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState<"all" | "attention" | "no_protocol">("all");

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data: overview } = await supabase.from("patient_overview").select("*");
    if (!overview) { setLoading(false); return; }

    const { data: assignments } = await supabase
      .from("patient_protocols")
      .select("patient_id, protocols(name)")
      .eq("is_active", true);

    const { data: unreadMsgs } = await supabase
      .from("messages").select("patient_id")
      .eq("sender", "patient").eq("read", false);

    const unreadMap: Record<string, number> = {};
    (unreadMsgs ?? []).forEach((m: { patient_id: string }) => {
      unreadMap[m.patient_id] = (unreadMap[m.patient_id] ?? 0) + 1;
    });

    const assignMap: Record<string, string> = {};
    (assignments ?? []).forEach((a: { patient_id: string; protocols: unknown }) => {
      const proto = a.protocols as { name?: string } | null;
      if (proto?.name) assignMap[a.patient_id] = proto.name;
    });

    setPatients(overview.map((p: PatientRow) => ({
      ...p,
      assigned_protocol: assignMap[p.id] ?? null,
      unread_messages: unreadMap[p.id] ?? 0,
    })));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = patients.filter(p => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === "attention") return (p.days_since_checkin ?? 99) > 3 || (p.weekly_completion_pct ?? 0) < 40;
    if (filter === "no_protocol") return !p.assigned_protocol;
    return true;
  });

  const stats = {
    total: patients.length,
    activeToday: patients.filter(p => p.days_since_checkin === 0).length,
    avgAdherence: patients.length
      ? Math.round(patients.reduce((s, p) => s + (p.weekly_completion_pct ?? 0), 0) / patients.length)
      : 0,
    attention: patients.filter(p => (p.days_since_checkin ?? 99) > 3 || (p.weekly_completion_pct ?? 0) < 40).length,
    noProtocol: patients.filter(p => !p.assigned_protocol).length,
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Panel</h1>
          <p className="text-sm text-gray-500 mt-0.5">{patients.length} enrolled · Frame Longevity</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => router.push("/practitioner/protocols/new")}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700">
            <Plus size={14} /> New Protocol
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: "Total patients",  value: stats.total,      color: "text-gray-900" },
          { label: "Active today",    value: stats.activeToday, color: "text-emerald-600" },
          { label: "Avg adherence",   value: `${stats.avgAdherence}%`, color: stats.avgAdherence >= 70 ? "text-emerald-600" : "text-amber-600" },
          { label: "Need attention",  value: stats.attention,  color: stats.attention > 0 ? "text-red-500" : "text-gray-900" },
          { label: "No protocol",     value: stats.noProtocol, color: stats.noProtocol > 0 ? "text-amber-600" : "text-gray-900" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Protocol shortcut */}
      <div onClick={() => router.push("/practitioner/protocols")}
        className="mb-5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl px-5 py-4 flex items-center gap-4 cursor-pointer hover:border-emerald-200 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">Protocol Library</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Build and assign clinical protocols · {stats.noProtocol > 0 ? `${stats.noProtocol} patients need one` : "All patients assigned"}
          </p>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patients..."
            className="w-full pl-8 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
        </div>
        {[
          { id: "all",         label: `All (${patients.length})` },
          { id: "attention",   label: `Needs attention (${stats.attention})` },
          { id: "no_protocol", label: `No protocol (${stats.noProtocol})` },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id as typeof filter)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
              filter === f.id ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Patient cards */}
      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading patients...</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">
          {search ? "No patients match your search." : "No patients enrolled yet."}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {filtered.map(p => (
            <PatientCard
              key={p.id}
              p={p}
              onClick={() => router.push(`/practitioner/patients/${p.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
