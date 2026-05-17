"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { FlaskConical, X, CheckCircle2, Circle } from "lucide-react";

interface Patient {
  id: string; name: string | null; age: number | null; biological_sex: string | null;
  goals: string[] | null; symptoms: string[] | null; primary_focus: string | null;
  height_ft: number | null; height_in: number | null; weight_lbs: number | null;
  created_at: string;
}

interface LabReading {
  id: string; source: string | null; uploaded_at: string;
  biomarkers: Array<{ id: string; name: string; value: number; unit: string; status: string }>;
}

interface ActiveProtocol {
  id: string; protocol_id: string; current_day: number; status: string;
  protocol_name: string; protocol_duration: number | null;
}

interface ProtocolStep {
  id: string; title: string; description: string | null; evidence_summary: string | null; sort_order: number;
}

interface Protocol {
  id: string; name: string; description: string | null; duration_days: number | null;
}

const STATUS_COLOR: Record<string, string> = {
  optimal:    "text-emerald-600 bg-emerald-50",
  low:        "text-amber-600 bg-amber-50",
  elevated:   "text-red-600 bg-red-50",
  borderline: "text-orange-600 bg-orange-50",
};

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const supabase = createClient();

  const [patient,         setPatient]         = useState<Patient | null>(null);
  const [labs,            setLabs]            = useState<LabReading[]>([]);
  const [activeProtocol,  setActiveProtocol]  = useState<ActiveProtocol | null>(null);
  const [protocolSteps,   setProtocolSteps]   = useState<ProtocolStep[]>([]);
  const [protocols,       setProtocols]       = useState<Protocol[]>([]);
  const [tab,             setTab]             = useState<"protocol" | "labs">("protocol");
  const [assigning,       setAssigning]       = useState(false);
  const [selectedProto,   setSelectedProto]   = useState("");
  const [assignLoading,   setAssignLoading]   = useState(false);
  const [assignError,     setAssignError]     = useState("");
  const [todayCompletions, setTodayCompletions] = useState<Set<string>>(new Set());

  async function load() {
    const [
      { data: p },
      { data: lr },
      { data: up },
      { data: proto },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).single(),
      supabase.from("lab_readings").select("*").eq("user_id", id).order("uploaded_at", { ascending: false }),
      supabase
        .from("user_protocols")
        .select("id, protocol_id, current_day, status, protocols_v2(name, duration_days)")
        .eq("user_id", id)
        .eq("status", "active")
        .maybeSingle(),
      supabase.from("protocols_v2").select("id, name, description, duration_days").eq("is_active", true).order("name"),
    ]);

    setPatient(p);
    setLabs(lr ?? []);
    setProtocols(proto ?? []);

    if (up) {
      const proto2 = up.protocols_v2 as unknown as { name: string; duration_days: number | null } | null;
      setActiveProtocol({
        id: up.id,
        protocol_id: up.protocol_id,
        current_day: up.current_day,
        status: up.status,
        protocol_name: proto2?.name ?? "Unknown Protocol",
        protocol_duration: proto2?.duration_days ?? null,
      });

      const { data: steps } = await supabase
        .from("protocol_steps")
        .select("id, title, description, evidence_summary, sort_order")
        .eq("protocol_id", up.protocol_id)
        .eq("day_number", 1)
        .order("sort_order");

      setProtocolSteps(steps ?? []);

      // Load today's completions
      const today = new Date().toISOString().split("T")[0];
      const { data: completions } = await supabase
        .from("step_completions")
        .select("step_id")
        .eq("user_id", id)
        .eq("completed_on", today);

      setTodayCompletions(new Set((completions ?? []).map(c => c.step_id)));
    }
  }

  useEffect(() => { load(); }, [id]);

  async function assignProtocol() {
    if (!selectedProto) return;
    setAssignLoading(true);
    setAssignError("");

    const res = await fetch(`/api/protocols/${selectedProto}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: id }),
    });

    if (res.ok) {
      await load();
      setAssigning(false);
      setSelectedProto("");
    } else {
      const data = await res.json();
      setAssignError(data.error ?? "Assignment failed.");
    }
    setAssignLoading(false);
  }

  if (!patient) return <div className="py-16 text-center text-sm text-gray-400">Loading...</div>;

  const initials = (patient.name ?? "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const latestLab = labs[0];

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600 mb-4">← Patients</button>

      {/* Header */}
      <div className="flex items-start gap-4 mb-5">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-xl font-bold text-emerald-700">
          {initials}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{patient.name ?? "Anonymous"}</h1>
          <p className="text-sm text-gray-500">
            {[patient.age && `${patient.age}y`, patient.biological_sex, patient.weight_lbs && `${patient.weight_lbs} lbs`].filter(Boolean).join(" · ")}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {(patient.goals ?? []).map(g => (
              <span key={g} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                {g.replace(/_/g, " ")}
              </span>
            ))}
            {(patient.symptoms ?? []).slice(0, 3).map(s => (
              <span key={s} className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">{s}</span>
            ))}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          {activeProtocol ? (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Active Protocol</p>
              <p className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                {activeProtocol.protocol_name}
              </p>
              <p className="text-xs text-gray-400 mt-1">Day {activeProtocol.current_day}{activeProtocol.protocol_duration ? ` of ${activeProtocol.protocol_duration}` : ""}</p>
            </div>
          ) : (
            <span className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full font-semibold">No protocol</span>
          )}
        </div>
      </div>

      {/* Latest lab snapshot */}
      {latestLab && (
        <div className="mb-5 bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-900">Latest Panel</p>
            <span className="text-xs text-gray-400">{new Date(latestLab.uploaded_at).toLocaleDateString()} · {latestLab.source ?? "Uploaded"}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {latestLab.biomarkers.filter(b => b.status !== "optimal").map(b => (
              <span key={b.id} className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[b.status] ?? "text-gray-600 bg-gray-100"}`}>
                {b.name} {b.value} {b.unit}
              </span>
            ))}
            {latestLab.biomarkers.filter(b => b.status !== "optimal").length === 0 && (
              <span className="text-xs text-emerald-600">All markers in optimal range</span>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {(["protocol", "labs"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Protocol tab ── */}
      {tab === "protocol" && (
        <div>
          {/* Assign form */}
          {(!activeProtocol || assigning) && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">
                  {activeProtocol ? "Switch Protocol" : "Assign Protocol"}
                </h3>
                {assigning && (
                  <button onClick={() => { setAssigning(false); setAssignError(""); }} className="text-gray-400 hover:text-gray-600">
                    <X size={16} />
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <select
                  value={selectedProto}
                  onChange={e => setSelectedProto(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 bg-white"
                >
                  <option value="">Choose a protocol...</option>
                  {protocols.map(p => <option key={p.id} value={p.id}>{p.name}{p.duration_days ? ` (${p.duration_days} days)` : ""}</option>)}
                </select>
                {selectedProto && (
                  <p className="text-xs text-gray-500">
                    {protocols.find(p => p.id === selectedProto)?.description ?? ""}
                  </p>
                )}
                {assignError && <p className="text-xs text-red-500">{assignError}</p>}
                <button
                  onClick={assignProtocol}
                  disabled={!selectedProto || assignLoading}
                  className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-40"
                >
                  {assignLoading ? "Assigning..." : activeProtocol ? "Switch to this protocol" : "Assign Protocol"}
                </button>
              </div>
            </div>
          )}

          {/* Active protocol steps */}
          {activeProtocol && !assigning && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{activeProtocol.protocol_name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {protocolSteps.length} daily steps · {todayCompletions.size} completed today
                  </p>
                </div>
                <button
                  onClick={() => setAssigning(true)}
                  className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg"
                >
                  Switch protocol
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {protocolSteps.slice(0, 10).map((step, i) => {
                  const done = todayCompletions.has(step.id);
                  return (
                    <div key={step.id} className="px-5 py-3.5 flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {done
                          ? <CheckCircle2 size={18} className="text-emerald-500" />
                          : <Circle size={18} className="text-gray-300" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${done ? "text-gray-400 line-through" : "text-gray-900"}`}>
                          {step.title}
                        </p>
                        {step.evidence_summary && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{step.evidence_summary}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">Step {i + 1}</span>
                    </div>
                  );
                })}
                {protocolSteps.length === 0 && (
                  <div className="px-5 py-8 text-center text-sm text-gray-400">
                    No steps configured for this protocol yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Labs tab ── */}
      {tab === "labs" && (
        <div className="space-y-4">
          {labs.length === 0 ? (
            <div className="py-12 text-center">
              <FlaskConical size={28} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-400">No lab readings uploaded yet.</p>
            </div>
          ) : labs.map(reading => (
            <div key={reading.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{reading.source ?? "Uploaded"}</p>
                  <p className="text-xs text-gray-400">{new Date(reading.uploaded_at).toLocaleDateString()}</p>
                </div>
                <span className="text-xs text-gray-400">{reading.biomarkers.length} biomarkers</span>
              </div>
              <div className="p-4 grid grid-cols-3 gap-2">
                {reading.biomarkers.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50">
                    <span className="text-xs text-gray-600 truncate flex-1">{b.name}</span>
                    <span className={`text-xs font-semibold ml-2 px-1.5 py-0.5 rounded flex-shrink-0 ${STATUS_COLOR[b.status] ?? "text-gray-600 bg-gray-100"}`}>
                      {b.value} {b.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
