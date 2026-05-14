"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { Protocol, Message, HealthAction } from "@/lib/types";
import { Send, FlaskConical, Plus, Trash2, ChevronDown, ChevronUp, Save, X } from "lucide-react";

interface Patient {
  id: string; name: string | null; age: number | null; biological_sex: string | null;
  goals: string[] | null; habits: Record<string, unknown> | null;
  weight_lbs: number | null; symptoms: string[] | null; created_at: string;
}
interface LabPanel { id: string; panel_date: string; source: string; biomarkers: Array<{ name: string; value: number; unit: string; status: string }> }
interface AssignedProtocol { protocol_id: string; notes: string | null; personalized_actions: HealthAction[] | null; protocol: Protocol | null }

const STATUS_COLOR: Record<string, string> = {
  optimal:    "text-emerald-600 bg-emerald-50",
  low:        "text-amber-600 bg-amber-50",
  elevated:   "text-red-600 bg-red-50",
  borderline: "text-orange-600 bg-orange-50",
};

const CATEGORIES = ["Nutrition", "Supplement", "Exercise", "Sleep", "Lifestyle", "Movement"];
const TIMES = ["morning", "midday", "evening"];

// ── Inline action editor ──────────────────────────────────────────────────────

function ActionEditor({
  action, index, total,
  onChange, onRemove, onMove,
}: {
  action: HealthAction; index: number; total: number;
  onChange: (a: HealthAction) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50">
        {/* Reorder */}
        <div className="flex flex-col gap-0.5 flex-shrink-0">
          <button onClick={() => onMove(-1)} disabled={index === 0} className="disabled:opacity-20 text-gray-400 hover:text-gray-600">
            <ChevronUp size={12} />
          </button>
          <button onClick={() => onMove(1)} disabled={index === total - 1} className="disabled:opacity-20 text-gray-400 hover:text-gray-600">
            <ChevronDown size={12} />
          </button>
        </div>

        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
          {index + 1}
        </span>

        {/* Title — editable inline */}
        <input
          value={action.title}
          onChange={e => onChange({ ...action, title: e.target.value })}
          className="flex-1 text-sm font-medium bg-transparent focus:outline-none text-gray-900 placeholder-gray-400 min-w-0"
          placeholder="Action title"
        />

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <select
            value={action.category}
            onChange={e => onChange({ ...action, category: e.target.value as HealthAction["category"] })}
            className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none"
          >
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select
            value={action.timeOfDay ?? "morning"}
            onChange={e => onChange({ ...action, timeOfDay: e.target.value as HealthAction["timeOfDay"] })}
            className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none"
          >
            {TIMES.map(t => <option key={t}>{t}</option>)}
          </select>
          <button onClick={() => setExpanded(x => !x)} className="text-gray-400 hover:text-gray-600 p-1">
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <button onClick={onRemove} className="text-gray-400 hover:text-red-500 p-1">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 py-3 space-y-2.5">
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wide">Patient description</label>
            <textarea
              value={action.description}
              onChange={e => onChange({ ...action, description: e.target.value })}
              rows={2}
              placeholder="What the patient sees and does — include specific dose, timing, product if relevant"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 resize-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wide">Mechanism / why it works</label>
            <textarea
              value={action.why}
              onChange={e => onChange({ ...action, why: e.target.value })}
              rows={2}
              placeholder="Biological rationale for this patient's specific case"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wide">Biomarker target</label>
              <input
                value={action.biomarkerTarget ?? ""}
                onChange={e => onChange({ ...action, biomarkerTarget: e.target.value })}
                placeholder="e.g. Vitamin D: 28 → 50-80 ng/mL"
                className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wide">Expected effect</label>
              <input
                value={action.effectSize ?? ""}
                onChange={e => onChange({ ...action, effectSize: e.target.value })}
                placeholder="e.g. +15–20 ng/mL in 8 weeks"
                className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [patient,   setPatient]   = useState<Patient | null>(null);
  const [labs,      setLabs]      = useState<LabPanel[]>([]);
  const [assigned,  setAssigned]  = useState<AssignedProtocol | null>(null);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [tab, setTab]             = useState<"protocol" | "labs" | "messages">("protocol");

  // Protocol editing state
  const [editActions, setEditActions]   = useState<HealthAction[]>([]);
  const [isDirty, setIsDirty]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const [assigning, setAssigning]       = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState("");
  const [assignNotes, setAssignNotes]   = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  // Messaging state
  const [msgBody, setMsgBody] = useState("");
  const [sending, setSending] = useState(false);
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
    if (a?.personalized_actions) {
      setEditActions(a.personalized_actions);
    }
  }

  useEffect(() => { load(); }, [id]);
  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function updateAction(i: number, a: HealthAction) {
    const updated = editActions.map((x, j) => j === i ? a : x);
    setEditActions(updated);
    setIsDirty(true);
  }

  function removeAction(i: number) {
    setEditActions(prev => prev.filter((_, j) => j !== i));
    setIsDirty(true);
  }

  function moveAction(i: number, dir: -1 | 1) {
    const arr = [...editActions];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setEditActions(arr);
    setIsDirty(true);
  }

  function addAction() {
    const blank: HealthAction = {
      id: `new-${Date.now()}`,
      title: "",
      description: "",
      category: "Lifestyle",
      why: "",
      completed: false,
      targetBiomarkers: [],
      timeOfDay: "morning",
    };
    setEditActions(prev => [...prev, blank]);
    setIsDirty(true);
  }

  async function saveActions() {
    setSaving(true);
    const res = await fetch(`/api/patient-protocols?patient_id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actions: editActions }),
    });
    if (res.ok) setIsDirty(false);
    setSaving(false);
  }

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
              <span key={s} className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                {s}
              </span>
            ))}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          {assigned?.protocol ? (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Active Protocol</p>
              <p className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                {assigned.protocol.name}
              </p>
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
            <span className="text-xs text-gray-400">{new Date(latestLab.panel_date).toLocaleDateString()} · {latestLab.source}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {latestLab.biomarkers.filter(b => b.status !== "optimal").map(b => (
              <span key={b.name} className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[b.status] ?? "text-gray-600 bg-gray-100"}`}>
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
        {(["protocol", "labs", "messages"] as const).map(t => (
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
          {!assigned && !assigning && (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
              <p className="text-sm text-gray-500 mb-4">No protocol assigned to this patient yet.</p>
              <button
                onClick={() => setAssigning(true)}
                className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700"
              >
                Assign Protocol
              </button>
            </div>
          )}

          {/* Assign new protocol form */}
          {assigning && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">
                  {assigned ? "Switch Protocol" : "Assign Protocol"}
                </h3>
                <button onClick={() => setAssigning(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-3">
                <select
                  value={selectedProtocol}
                  onChange={e => setSelectedProtocol(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 bg-white"
                >
                  <option value="">Choose a protocol template...</option>
                  {protocols.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <textarea
                  value={assignNotes}
                  onChange={e => setAssignNotes(e.target.value)}
                  placeholder="Notes for AI personalization — medications, preferences, specific clinical context..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 resize-none"
                />
                <button
                  onClick={assignProtocol}
                  disabled={!selectedProtocol || assignLoading}
                  className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-40"
                >
                  {assignLoading ? "Personalizing with AI (~15s)..." : "Assign & Personalize with AI"}
                </button>
              </div>
            </div>
          )}

          {/* Protocol action editor */}
          {assigned && editActions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {assigned.protocol?.name ?? "Assigned Protocol"}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {editActions.length} actions · Edit inline, changes save immediately
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isDirty && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full font-medium">
                      Unsaved changes
                    </span>
                  )}
                  <button
                    onClick={() => setAssigning(true)}
                    className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg"
                  >
                    Switch template
                  </button>
                  <button
                    onClick={saveActions}
                    disabled={!isDirty || saving}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-40"
                  >
                    <Save size={13} />
                    {saving ? "Saving..." : "Save to patient"}
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-3">
                {editActions.map((a, i) => (
                  <ActionEditor
                    key={a.id}
                    action={a}
                    index={i}
                    total={editActions.length}
                    onChange={updated => updateAction(i, updated)}
                    onRemove={() => removeAction(i)}
                    onMove={dir => moveAction(i, dir)}
                  />
                ))}
              </div>

              <button
                onClick={addAction}
                className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-emerald-300 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Add action to this patient's protocol
              </button>

              {isDirty && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between">
                  <p className="text-xs text-amber-700">Changes not yet saved — patient still sees the previous version.</p>
                  <button
                    onClick={saveActions}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-40"
                  >
                    <Save size={12} />
                    {saving ? "Saving..." : "Save now"}
                  </button>
                </div>
              )}
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

      {/* ── Messages tab ── */}
      {tab === "messages" && (
        <div className="bg-white rounded-xl border border-gray-100 flex flex-col" style={{ height: 520 }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-center text-sm text-gray-400 pt-8">No messages yet.</p>
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
            <button onClick={sendMessage} disabled={!msgBody.trim() || sending}
              className="p-2.5 bg-emerald-600 text-white rounded-xl disabled:opacity-40 hover:bg-emerald-700">
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
