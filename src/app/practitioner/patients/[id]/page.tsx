"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { Protocol, Message } from "@/lib/types";
import { Send, CheckCircle, Circle, FlaskConical } from "lucide-react";

interface Patient {
  id: string; name: string | null; age: number | null; biological_sex: string | null;
  goals: string[] | null; habits: Record<string, unknown> | null;
  weight_lbs: number | null; symptoms: string[] | null; created_at: string;
}
interface LabPanel { id: string; panel_date: string; source: string; biomarkers: Array<{ name: string; value: number; unit: string; status: string }> }
interface AssignedProtocol { protocol_id: string; notes: string | null; personalized_actions: unknown[] | null; protocol: Protocol | null }

const STATUS_COLOR: Record<string, string> = {
  optimal: "text-emerald-600 bg-emerald-50",
  low:     "text-amber-600 bg-amber-50",
  elevated:"text-red-600 bg-red-50",
  borderline: "text-orange-600 bg-orange-50",
};

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [patient,  setPatient]  = useState<Patient | null>(null);
  const [labs,     setLabs]     = useState<LabPanel[]>([]);
  const [assigned, setAssigned] = useState<AssignedProtocol | null>(null);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tab, setTab]           = useState<"overview" | "labs" | "messages">("overview");
  const [assigning, setAssigning] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [msgBody, setMsgBody]   = useState("");
  const [sending, setSending]   = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);

  async function load() {
    const [{ data: p }, { data: l }, { data: a }, { data: proto }, { data: m }] = await Promise.all([
      supabase.from("patients").select("*").eq("id", id).single(),
      supabase.from("lab_panels").select("*").eq("patient_id", id).order("panel_date", { ascending: false }),
      supabase.from("patient_protocols").select("*, protocol:protocols(*, protocol_actions(*))").eq("patient_id", id).eq("is_active", true).maybeSingle(),
      supabase.from("protocols").select("id, name").eq("is_active", true).order("name"),
      supabase.from("messages").select("*").eq("patient_id", id).order("created_at", { ascending: true }),
    ]);
    setPatient(p);
    setLabs(l ?? []);
    setAssigned(a ?? null);
    setProtocols(proto ?? []);
    setMessages(m ?? []);
    if (a?.protocol_id) setSelectedProtocol(a.protocol_id);
  }

  useEffect(() => { load(); }, [id]);
  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function assignProtocol() {
    setAssignLoading(true);
    const res = await fetch(`/api/protocols/${selectedProtocol}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: id, notes: assignNotes }),
    });
    if (res.ok) {
      await load();
      setAssigning(false);
      setAssignNotes("");
    }
    setAssignLoading(false);
  }

  async function sendMessage() {
    if (!msgBody.trim()) return;
    setSending(true);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: id, sender: "practitioner", body: msgBody.trim() }),
    });
    if (res.ok) {
      const msg = await res.json();
      setMessages(m => [...m, msg]);
      setMsgBody("");
    }
    setSending(false);
  }

  if (!patient) return <div className="py-16 text-center text-sm text-gray-400">Loading...</div>;

  const initials = (patient.name ?? "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const latestLab = labs[0];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600 mb-4">← Patients</button>

      <div className="flex items-start gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-xl font-bold text-emerald-700">
          {initials}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{patient.name ?? "Anonymous"}</h1>
          <p className="text-sm text-gray-500">
            {[patient.age && `${patient.age}y`, patient.biological_sex, patient.weight_lbs && `${patient.weight_lbs} lbs`]
              .filter(Boolean).join(" · ")}
          </p>
          {(patient.goals ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {(patient.goals ?? []).map(g => (
                <span key={g} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                  {g.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Assigned protocol badge */}
        <div className="text-right">
          {assigned?.protocol ? (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Active Protocol</p>
              <p className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                {assigned.protocol.name}
              </p>
            </div>
          ) : (
            <span className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full font-semibold">No protocol assigned</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {(["overview", "labs", "messages"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        <div className="space-y-5">
          {/* Protocol assignment */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Protocol Assignment</h2>
              <button
                onClick={() => setAssigning(x => !x)}
                className="text-sm text-emerald-600 font-semibold hover:text-emerald-700"
              >
                {assigning ? "Cancel" : assigned ? "Change Protocol" : "Assign Protocol"}
              </button>
            </div>

            {assigning ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Select Protocol</label>
                  <select
                    value={selectedProtocol}
                    onChange={e => setSelectedProtocol(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 bg-white"
                  >
                    <option value="">Choose a protocol...</option>
                    {protocols.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Notes for AI personalization (optional)</label>
                  <textarea
                    value={assignNotes}
                    onChange={e => setAssignNotes(e.target.value)}
                    placeholder="e.g. Patient is on metformin, prefers morning workouts, vegetarian diet..."
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 resize-none"
                  />
                </div>
                <button
                  onClick={assignProtocol}
                  disabled={!selectedProtocol || assignLoading}
                  className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                >
                  {assignLoading ? "Personalizing with AI..." : "Assign & Personalize"}
                </button>
                {assignLoading && (
                  <p className="text-xs text-gray-400">AI is personalizing the protocol to this patient's lab values. This takes ~15 seconds.</p>
                )}
              </div>
            ) : assigned?.personalized_actions ? (
              <div className="space-y-2">
                {(assigned.personalized_actions as Array<{ title: string; category: string; completed?: boolean; why?: string }>).map((a, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <Circle size={15} className="text-gray-300 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{a.title}</p>
                      {a.why && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{a.why}</p>}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{a.category}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No protocol assigned. Assign one to generate a personalized action plan for this patient.</p>
            )}
          </div>

          {/* Patient info */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Health Profile</h2>
            <div className="grid grid-cols-2 gap-y-2.5 text-sm">
              {patient.habits && Object.entries(patient.habits as Record<string, unknown>).map(([k, v]) => (
                v ? <div key={k} className="flex justify-between">
                  <span className="text-gray-500 capitalize">{k.replace(/([A-Z])/g, " $1").toLowerCase()}</span>
                  <span className="text-gray-900 font-medium">{String(v)}</span>
                </div> : null
              ))}
              {(patient.symptoms ?? []).length > 0 && (
                <div className="col-span-2">
                  <span className="text-gray-500 block mb-1.5">Symptoms</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(patient.symptoms ?? []).map(s => (
                      <span key={s} className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Latest lab snapshot */}
          {latestLab && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900">Latest Panel</h2>
                <span className="text-xs text-gray-400">
                  {new Date(latestLab.panel_date).toLocaleDateString()} · {latestLab.source}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {latestLab.biomarkers.filter(b => b.status !== "optimal").slice(0, 9).map(b => (
                  <div key={b.name} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                    <span className="text-xs text-gray-600 truncate">{b.name}</span>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${STATUS_COLOR[b.status] ?? "text-gray-600 bg-gray-100"}`}>
                      {b.value} {b.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Labs tab */}
      {tab === "labs" && (
        <div className="space-y-4">
          {labs.length === 0 ? (
            <div className="py-12 text-center">
              <FlaskConical size={28} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-400">No lab panels uploaded yet.</p>
            </div>
          ) : labs.map(panel => (
            <div key={panel.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{panel.source}</p>
                  <p className="text-xs text-gray-400">{new Date(panel.panel_date).toLocaleDateString()}</p>
                </div>
                <span className="text-xs text-gray-400">{panel.biomarkers.length} biomarkers</span>
              </div>
              <div className="p-4 grid grid-cols-3 gap-2">
                {panel.biomarkers.map(b => (
                  <div key={b.name} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50">
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

      {/* Messages tab */}
      {tab === "messages" && (
        <div className="bg-white rounded-xl border border-gray-100 flex flex-col" style={{ height: 520 }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-center text-sm text-gray-400 pt-8">No messages yet. Send the patient a note.</p>
            )}
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.sender === "practitioner" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${
                  m.sender === "practitioner"
                    ? "bg-emerald-600 text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-800 rounded-bl-sm"
                }`}>
                  <p>{m.body}</p>
                  <p className={`text-[10px] mt-1 ${m.sender === "practitioner" ? "text-emerald-200" : "text-gray-400"}`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={msgEndRef} />
          </div>
          <div className="border-t border-gray-100 p-3 flex gap-2">
            <input
              value={msgBody}
              onChange={e => setMsgBody(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Message patient..."
              className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400"
            />
            <button
              onClick={sendMessage}
              disabled={!msgBody.trim() || sending}
              className="p-2.5 bg-emerald-600 text-white rounded-xl disabled:opacity-40 hover:bg-emerald-700"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
