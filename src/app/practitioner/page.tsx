"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { Plus, Search, RefreshCw, CheckCircle2, Clock, AlertCircle, Mail, X } from "lucide-react";

interface PatientRow {
  id: string;
  name: string | null;
  age: number | null;
  biological_sex: string | null;
  goals: string[] | null;
  primary_focus: string | null;
  created_at: string;
  assigned_protocol: string | null;
  protocol_id: string | null;
  steps_today: number;
  steps_total: number;
}

function AdherenceRing({ done, total }: { done: number; total: number }) {
  const pct  = total > 0 ? done / total : 0;
  const r    = 16;
  const circ = 2 * Math.PI * r;
  const color = pct >= 0.8 ? "#10b981" : pct >= 0.5 ? "#f59e0b" : total === 0 ? "#d1d5db" : "#ef4444";
  return (
    <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0">
      <svg className="-rotate-90" width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={r} fill="none" stroke="#f3f4f6" strokeWidth="3.5" />
        <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="3.5"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round" />
      </svg>
      <span className="absolute text-[9px] font-bold" style={{ color }}>
        {total > 0 ? `${done}/${total}` : "—"}
      </span>
    </div>
  );
}

function PatientCard({ p, onClick }: { p: PatientRow; onClick: () => void }) {
  const noProtocol = !p.assigned_protocol;
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border p-4 cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 relative"
      style={{ borderColor: noProtocol ? "rgba(245,158,11,0.3)" : "#f3f4f6" }}
    >
      {noProtocol && (
        <div className="absolute top-3 right-3">
          <AlertCircle size={14} className="text-amber-400" />
        </div>
      )}

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
      </div>

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

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AdherenceRing done={p.steps_today} total={p.steps_total} />
          <div>
            <p className="text-[10px] font-semibold text-gray-500">Today's steps</p>
            <p className="text-[10px] text-gray-400">
              {p.steps_total > 0 ? `${p.steps_today} of ${p.steps_total} done` : "No data yet"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400">
            {(p.goals ?? []).slice(0, 2).map(g => g.replace(/_/g, " ")).join(", ") || "No goals set"}
          </p>
        </div>
      </div>
    </div>
  );
}

interface ProtocolOption {
  id: string;
  name: string;
}

export default function PractitionerDashboard() {
  const router   = useRouter();
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState<"all" | "no_protocol">("all");

  // Invite patient modal
  const [inviteOpen,       setInviteOpen]       = useState(false);
  const [inviteEmail,      setInviteEmail]      = useState("");
  const [inviteProtocolId, setInviteProtocolId] = useState("");
  const [inviteSending,    setInviteSending]    = useState(false);
  const [inviteResult,     setInviteResult]     = useState<{ ok?: boolean; error?: string } | null>(null);
  const [protocols,        setProtocols]        = useState<ProtocolOption[]>([]);

  async function loadProtocols(organizationId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("protocols_v2")
      .select("id, name")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("created_at");
    const list = data ?? [];
    setProtocols(list);
    if (list.length) setInviteProtocolId(list[0].id);
  }

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    // Get practitioner's org
    const { data: me } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", session.user.id)
      .single();

    if (!me?.organization_id) { setLoading(false); return; }
    loadProtocols(me.organization_id);

    // Load patients in same org
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, age, biological_sex, goals, primary_focus, created_at")
      .eq("organization_id", me.organization_id)
      .eq("role", "user")
      .order("created_at", { ascending: false });

    if (!profiles?.length) { setPatients([]); setLoading(false); return; }

    const patientIds = profiles.map(p => p.id);
    const today = new Date().toISOString().split("T")[0];

    // Load active protocol assignments
    const { data: userProtocols } = await supabase
      .from("user_protocols")
      .select("user_id, protocol_id, protocols_v2(name)")
      .in("user_id", patientIds)
      .eq("status", "active");

    // Load today's step completions
    const { data: completions } = await supabase
      .from("step_completions")
      .select("user_id, step_id")
      .in("user_id", patientIds)
      .eq("completed_on", today);

    // Load total steps per protocol
    const protocolIds = [...new Set((userProtocols ?? []).map(up => up.protocol_id))];
    const { data: stepCounts } = protocolIds.length
      ? await supabase
          .from("protocol_steps")
          .select("protocol_id")
          .in("protocol_id", protocolIds)
          .eq("day_number", 1)
      : { data: [] };

    const protocolMap: Record<string, { name: string; id: string }> = {};
    (userProtocols ?? []).forEach(up => {
      const proto = up.protocols_v2 as unknown as { name: string } | null;
      if (proto) protocolMap[up.user_id] = { name: proto.name, id: up.protocol_id };
    });

    const stepCountByProtocol: Record<string, number> = {};
    (stepCounts ?? []).forEach(s => {
      stepCountByProtocol[s.protocol_id] = (stepCountByProtocol[s.protocol_id] ?? 0) + 1;
    });

    const completionsByUser: Record<string, number> = {};
    (completions ?? []).forEach(c => {
      completionsByUser[c.user_id] = (completionsByUser[c.user_id] ?? 0) + 1;
    });

    setPatients(profiles.map(p => {
      const proto = protocolMap[p.id] ?? null;
      const stepsTotal = proto ? Math.min(stepCountByProtocol[proto.id] ?? 0, 5) : 0;
      return {
        ...p,
        assigned_protocol: proto?.name ?? null,
        protocol_id: proto?.id ?? null,
        steps_today: completionsByUser[p.id] ?? 0,
        steps_total: stepsTotal,
      };
    }));

    setLoading(false);
  }

  async function handleInvitePatient(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviteSending(true);
    setInviteResult(null);

    try {
      const res  = await fetch("/api/practitioner/invite-patient", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          email:       inviteEmail,
          protocol_id: inviteProtocolId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) setInviteResult({ error: data.error ?? "Invite failed" });
      else {
        setInviteResult({ ok: true });
        setInviteEmail("");
        load(); // Refresh patient list
      }
    } catch {
      setInviteResult({ error: "Network error — try again." });
    }

    setInviteSending(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = patients.filter(p => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === "no_protocol") return !p.assigned_protocol;
    return true;
  });

  const stats = {
    total:      patients.length,
    assigned:   patients.filter(p => p.assigned_protocol).length,
    noProtocol: patients.filter(p => !p.assigned_protocol).length,
    activeToday: patients.filter(p => p.steps_today > 0).length,
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Panel</h1>
          <p className="text-sm text-gray-500 mt-0.5">{patients.length} enrolled</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => { setInviteOpen(true); setInviteResult(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Mail size={14} /> Invite Patient
          </button>
          <button onClick={() => router.push("/practitioner/protocols/new")}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700">
            <Plus size={14} /> New Protocol
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total patients",  value: stats.total,       color: "text-gray-900" },
          { label: "On a protocol",   value: stats.assigned,    color: "text-emerald-600" },
          { label: "Active today",    value: stats.activeToday, color: "text-emerald-600" },
          { label: "Need protocol",   value: stats.noProtocol,  color: stats.noProtocol > 0 ? "text-amber-600" : "text-gray-900" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patients..."
            className="w-full pl-8 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
        </div>
        {([
          { id: "all",         label: `All (${patients.length})` },
          { id: "no_protocol", label: `No protocol (${stats.noProtocol})` },
        ] as const).map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
              filter === f.id ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading patients...</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">
          {search ? "No patients match your search." : "No patients enrolled yet."}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {filtered.map(p => (
            <PatientCard key={p.id} p={p} onClick={() => router.push(`/practitioner/patients/${p.id}`)} />
          ))}
        </div>
      )}

      {/* Invite Patient Modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
            <button
              onClick={() => { setInviteOpen(false); setInviteResult(null); setInviteEmail(""); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>

            <h2 className="text-base font-semibold text-gray-900 mb-1">Invite Patient</h2>
            <p className="text-xs text-gray-500 mb-5">
              They&apos;ll receive an email to set up their account and download the app. Their protocol will be pre-assigned.
            </p>

            {inviteResult?.ok ? (
              <div className="text-center py-4">
                <p className="text-emerald-600 font-semibold text-sm mb-1">Invite sent.</p>
                <p className="text-xs text-gray-500 mb-4">
                  The patient will receive an email with a link to activate their account.
                </p>
                <button
                  onClick={() => { setInviteOpen(false); setInviteResult(null); setInviteEmail(""); }}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleInvitePatient} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                    Patient email
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="patient@example.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-400"
                    required
                    autoFocus
                  />
                </div>

                {protocols.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                      Protocol
                    </label>
                    <select
                      value={inviteProtocolId}
                      onChange={e => setInviteProtocolId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-400 bg-white"
                    >
                      {protocols.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {inviteResult?.error && (
                  <p className="text-xs text-red-500">{inviteResult.error}</p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => { setInviteOpen(false); setInviteResult(null); setInviteEmail(""); }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteSending || !inviteEmail}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-emerald-700 transition-colors"
                  >
                    {inviteSending ? "Sending…" : "Send invite"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
