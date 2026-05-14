"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { TrendingUp, TrendingDown, Search, RefreshCw, MessageSquare } from "lucide-react";

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

function statusBadge(pct: number | null) {
  if (pct === null) return { label: "No data", cls: "bg-gray-100 text-gray-400" };
  if (pct >= 80)   return { label: `${pct}%`, cls: "bg-emerald-50 text-emerald-700" };
  if (pct >= 50)   return { label: `${pct}%`, cls: "bg-amber-50 text-amber-700" };
  return              { label: `${pct}%`, cls: "bg-red-50 text-red-600" };
}

function lastSeenLabel(days: number | null) {
  if (days === null) return { text: "Never",     dot: "bg-gray-300" };
  if (days === 0)    return { text: "Today",     dot: "bg-emerald-400" };
  if (days === 1)    return { text: "Yesterday", dot: "bg-blue-400" };
  if (days <= 3)     return { text: `${days}d ago`, dot: "bg-amber-400" };
  return             { text: `${days}d ago`, dot: "bg-red-400" };
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

    // Enrich with assigned protocol name
    const { data: assignments } = await supabase
      .from("patient_protocols")
      .select("patient_id, protocols(name)")
      .eq("is_active", true);

    const { data: unreadMsgs } = await supabase
      .from("messages")
      .select("patient_id")
      .eq("sender", "patient")
      .eq("read", false);

    const unreadMap: Record<string, number> = {};
    (unreadMsgs ?? []).forEach((m: { patient_id: string }) => {
      unreadMap[m.patient_id] = (unreadMap[m.patient_id] ?? 0) + 1;
    });

    const assignMap: Record<string, string> = {};
    (assignments ?? []).forEach((a: { patient_id: string; protocols: unknown }) => {
      const proto = a.protocols as { name?: string } | null;
      if (proto?.name) assignMap[a.patient_id] = proto.name;
    });

    const enriched = overview.map((p: PatientRow) => ({
      ...p,
      assigned_protocol: assignMap[p.id] ?? null,
      unread_messages: unreadMap[p.id] ?? 0,
    }));

    setPatients(enriched);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = patients.filter(p => {
    const matchSearch = !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.primary_focus?.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === "attention") return (p.days_since_checkin ?? 99) > 3;
    if (filter === "no_protocol") return !p.assigned_protocol;
    return true;
  });

  const stats = [
    { label: "Total Patients",   value: patients.length },
    { label: "Active Today",     value: patients.filter(p => p.days_since_checkin === 0).length },
    { label: "Avg Adherence",    value: patients.length ? Math.round(patients.reduce((s, p) => s + (p.weekly_completion_pct ?? 0), 0) / patients.length) + "%" : "—" },
    { label: "Need Attention",   value: patients.filter(p => (p.days_since_checkin ?? 99) > 3).length },
    { label: "No Protocol",      value: patients.filter(p => !p.assigned_protocol).length },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your patient panel and protocols</p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters + search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search patients..."
            className="w-full pl-8 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400"
          />
        </div>
        {[
          { id: "all",         label: "All" },
          { id: "attention",   label: `Needs attention (${patients.filter(p => (p.days_since_checkin ?? 99) > 3).length})` },
          { id: "no_protocol", label: `No protocol (${patients.filter(p => !p.assigned_protocol).length})` },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as typeof filter)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
              filter === f.id ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Patient table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Loading patients...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            {search ? "No patients match your search." : "No patients yet."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100 bg-gray-50">
                <th className="px-5 py-3 text-left">Patient</th>
                <th className="px-5 py-3 text-left">Protocol</th>
                <th className="px-5 py-3 text-left">Latest Panel</th>
                <th className="px-5 py-3 text-left">7-Day Adherence</th>
                <th className="px-5 py-3 text-left">Last Active</th>
                <th className="px-5 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const status = statusBadge(p.weekly_completion_pct);
                const seen = lastSeenLabel(p.days_since_checkin);
                return (
                  <tr
                    key={p.id}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/practitioner/patients/${p.id}`)}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-xs font-bold text-emerald-700 flex-shrink-0">
                          {(p.name ?? "?")[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{p.name ?? "Anonymous"}</p>
                          <p className="text-xs text-gray-400">
                            {[p.age && `${p.age}y`, p.biological_sex].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        {(p.unread_messages ?? 0) > 0 && (
                          <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-semibold">
                            <MessageSquare size={10} />
                            {p.unread_messages}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {p.assigned_protocol ? (
                        <span className="text-sm text-gray-700">{p.assigned_protocol}</span>
                      ) : (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-semibold">No protocol</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">
                      {p.latest_panel_date ? new Date(p.latest_panel_date).toLocaleDateString() : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${status.cls}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${seen.dot}`} />
                        <span className="text-gray-600 text-xs">{seen.text}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {(p.weekly_completion_pct ?? 0) < 50 && <TrendingDown size={13} className="text-red-400" />}
                        {(p.weekly_completion_pct ?? 0) >= 80 && <TrendingUp size={13} className="text-emerald-500" />}
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
