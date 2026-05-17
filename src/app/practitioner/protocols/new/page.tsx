"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ChevronDown, ChevronUp, Save, Sparkles, Loader } from "lucide-react";
import { ProtocolAction } from "@/lib/types";

const CATEGORIES = ["Nutrition", "Supplement", "Exercise", "Sleep", "Lifestyle", "Movement"];
const TIMES = ["morning", "midday", "evening"];
const FOCUS_OPTIONS = ["metabolic", "hormones", "cognitive", "longevity", "sleep", "cardiac", "weight"];

type DraftAction = Omit<ProtocolAction, "id" | "protocol_id"> & { _key: string };

const emptyAction = (): DraftAction => ({
  _key: Math.random().toString(36).slice(2),
  title: "",
  description: "",
  mechanism: "",
  category: "Lifestyle",
  time_of_day: "morning",
  biomarker_targets: [],
  evidence_grade: "B",
  effect_size: "",
  time_to_effect: "",
  citations: [],
  is_conditional: false,
  sort_order: 0,
});

function ActionForm({
  action, index, total,
  onChange, onRemove, onMove,
}: {
  action: DraftAction; index: number; total: number;
  onChange: (a: DraftAction) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [expanded, setExpanded] = useState(index === 0);

  const field = (key: keyof DraftAction, label: string, placeholder = "") => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      <input
        value={(action[key] as string) ?? ""}
        onChange={e => onChange({ ...action, [key]: e.target.value })}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400"
      />
    </div>
  );

  const textarea = (key: keyof DraftAction, label: string, placeholder = "") => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      <textarea
        value={(action[key] as string) ?? ""}
        onChange={e => onChange({ ...action, [key]: e.target.value })}
        placeholder={placeholder}
        rows={2}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 resize-none"
      />
    </div>
  );

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="disabled:opacity-30 text-gray-400 hover:text-gray-600"
          >
            <ChevronUp size={13} />
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="disabled:opacity-30 text-gray-400 hover:text-gray-600"
          >
            <ChevronDown size={13} />
          </button>
        </div>
        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
          {index + 1}
        </span>
        <input
          value={action.title}
          onChange={e => onChange({ ...action, title: e.target.value })}
          placeholder="Action title (e.g. 'Take 5000 IU Vitamin D3 with fat')"
          className="flex-1 text-sm font-medium bg-transparent focus:outline-none text-gray-900 placeholder-gray-400"
        />
        <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
          <select
            value={action.category}
            onChange={e => onChange({ ...action, category: e.target.value as ProtocolAction["category"] })}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none"
          >
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select
            value={action.time_of_day}
            onChange={e => onChange({ ...action, time_of_day: e.target.value as ProtocolAction["time_of_day"] })}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none"
          >
            {TIMES.map(t => <option key={t}>{t}</option>)}
          </select>
          <button onClick={() => setExpanded(x => !x)} className="text-gray-400 hover:text-gray-600 p-1">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={onRemove} className="text-gray-400 hover:text-red-500 p-1">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Expanded fields */}
      {expanded && (
        <div className="px-4 py-4 grid grid-cols-2 gap-3">
          {textarea("description", "Patient-facing description", "What the patient will see and do")}
          {textarea("mechanism", "Mechanism / why it works", "The biological rationale")}
          <div className="grid grid-cols-3 gap-2">
            {field("evidence_grade", "Evidence Grade", "A / B / C")}
            {field("effect_size", "Effect Size", "e.g. +15% testosterone")}
            {field("time_to_effect", "Time to Effect", "e.g. 8–12 weeks")}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Biomarker Targets (comma-separated)</label>
            <input
              value={(action.biomarker_targets ?? []).join(", ")}
              onChange={e => onChange({ ...action, biomarker_targets: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
              placeholder="vitaminD, testosterone, hscrp"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Citations (PMIDs, comma-separated)</label>
            <input
              value={(action.citations ?? []).join(", ")}
              onChange={e => onChange({ ...action, citations: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
              placeholder="12345678, 87654321"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400"
            />
          </div>

          {/* Conditional logic */}
          <div className="col-span-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={action.is_conditional}
                onChange={e => onChange({ ...action, is_conditional: e.target.checked })}
                className="rounded"
              />
              Only apply if specific biomarker condition is met
            </label>
            {action.is_conditional && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={action.condition_biomarker ?? ""}
                  onChange={e => onChange({ ...action, condition_biomarker: e.target.value })}
                  placeholder="Biomarker key (e.g. vitaminD)"
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
                />
                <select
                  value={action.condition_operator ?? "below"}
                  onChange={e => onChange({ ...action, condition_operator: e.target.value as "below" | "above" })}
                  className="px-2 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white"
                >
                  <option value="below">is below</option>
                  <option value="above">is above</option>
                </select>
                <input
                  type="number"
                  value={action.condition_threshold ?? ""}
                  onChange={e => onChange({ ...action, condition_threshold: parseFloat(e.target.value) })}
                  placeholder="Threshold value"
                  className="w-32 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewProtocolPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [targetConditions, setTargetConditions] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [actions, setActions] = useState<DraftAction[]>([emptyAction()]);
  const [saving, setSaving] = useState(false);

  // AI draft state
  const [aiGoal, setAiGoal] = useState("");
  const [aiContext, setAiContext] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [showAi, setShowAi] = useState(true);

  const toggleFocus = (f: string) =>
    setFocusAreas(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);

  const updateAction = (i: number, a: DraftAction) =>
    setActions(prev => prev.map((x, j) => j === i ? a : x));

  const removeAction = (i: number) =>
    setActions(prev => prev.filter((_, j) => j !== i));

  const moveAction = (i: number, dir: -1 | 1) => {
    const arr = [...actions];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setActions(arr);
  };

  async function draftWithAI() {
    if (!aiGoal.trim()) return;
    setDrafting(true);
    setDraftError("");
    try {
      const res = await fetch("/api/protocols/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: aiGoal.trim(), context: aiContext.trim() || undefined }),
      });
      if (!res.ok) throw new Error("Draft failed");
      const draft = await res.json();

      setName(draft.name ?? "");
      setDescription(draft.description ?? "");
      setFocusAreas(draft.focus_areas ?? []);
      setTargetConditions((draft.target_conditions ?? []).join(", "));
      setActions(
        (draft.actions ?? []).map((a: Record<string, unknown>, i: number): DraftAction => ({
          _key: `ai-${i}`,
          title: (a.title as string) ?? "",
          description: (a.description as string) ?? "",
          mechanism: (a.mechanism as string) ?? "",
          category: (a.category as ProtocolAction["category"]) ?? "Lifestyle",
          time_of_day: (a.time_of_day as ProtocolAction["time_of_day"]) ?? "morning",
          biomarker_targets: (a.biomarker_targets as string[]) ?? [],
          evidence_grade: (a.evidence_grade as string) ?? "B",
          effect_size: (a.effect_size as string) ?? "",
          time_to_effect: (a.time_to_effect as string) ?? "",
          citations: (a.citations as string[]) ?? [],
          is_conditional: false,
          sort_order: i,
        }))
      );
      setShowAi(false);
    } catch {
      setDraftError("AI draft failed. Try again or build manually.");
    }
    setDrafting(false);
  }

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/protocols", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || null,
        focus_areas: focusAreas,
        target_conditions: targetConditions.split(",").map(s => s.trim()).filter(Boolean),
        target_age_min: ageMin ? parseInt(ageMin) : null,
        target_age_max: ageMax ? parseInt(ageMax) : null,
        actions: actions.filter(a => a.title.trim()),
      }),
    });
    if (res.ok) {
      router.push("/practitioner/protocols");
    } else {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600 mb-1">
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">New Protocol</h1>
        </div>
        <button
          onClick={save}
          disabled={saving || !name.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-40 transition-colors"
        >
          <Save size={14} />
          {saving ? "Saving..." : "Save Protocol"}
        </button>
      </div>

      {/* AI Draft panel */}
      {showAi ? (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-emerald-600" />
            <h2 className="text-sm font-bold text-emerald-900">Draft with AI</h2>
            <button
              onClick={() => setShowAi(false)}
              className="ml-auto text-xs text-emerald-600 hover:text-emerald-800"
            >
              Build manually instead
            </button>
          </div>
          <p className="text-xs text-emerald-700 mb-3">
            Describe the clinical goal and AI will generate a full evidence-based protocol with mechanisms, effect sizes, and citations.
          </p>
          <textarea
            value={aiGoal}
            onChange={e => setAiGoal(e.target.value)}
            placeholder="e.g. Reverse insulin resistance in a 52-year-old male with HbA1c of 6.1 and fasting glucose of 112..."
            rows={2}
            className="w-full px-4 py-3 text-sm bg-white border border-emerald-200 rounded-xl focus:outline-none focus:border-emerald-400 resize-none mb-2"
          />
          <textarea
            value={aiContext}
            onChange={e => setAiContext(e.target.value)}
            placeholder="Additional context (optional): patient age range, contraindications, preferred intervention types..."
            rows={1}
            className="w-full px-4 py-2.5 text-sm bg-white border border-emerald-200 rounded-xl focus:outline-none focus:border-emerald-400 resize-none mb-3"
          />
          {draftError && (
            <p className="text-xs text-red-600 mb-2">{draftError}</p>
          )}
          <button
            onClick={draftWithAI}
            disabled={!aiGoal.trim() || drafting}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-40 transition-colors"
          >
            {drafting ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {drafting ? "Generating protocol (~20s)..." : "Generate Protocol with AI"}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAi(true)}
          className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 mb-4"
        >
          <Sparkles size={12} /> Re-draft with AI
        </button>
      )}

      {/* Protocol metadata */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Protocol Name *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Metabolic Optimization — T2D"
            className="w-full px-4 py-2.5 text-base font-medium border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Brief description of this protocol's purpose and intended patient profile"
            rows={2}
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 resize-none"
          />
        </div>

        {/* Focus areas */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Focus Areas</label>
          <div className="flex flex-wrap gap-2">
            {FOCUS_OPTIONS.map(f => (
              <button
                key={f}
                onClick={() => toggleFocus(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all capitalize ${
                  focusAreas.includes(f)
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Target Conditions</label>
            <input
              value={targetConditions}
              onChange={e => setTargetConditions(e.target.value)}
              placeholder="T2D, cognitive decline..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Age Min</label>
            <input
              type="number"
              value={ageMin}
              onChange={e => setAgeMin(e.target.value)}
              placeholder="e.g. 50"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Age Max</label>
            <input
              type="number"
              value={ageMax}
              onChange={e => setAgeMax(e.target.value)}
              placeholder="e.g. 80"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Protocol Actions</h2>
        <span className="text-xs text-gray-400">{actions.filter(a => a.title).length} defined</span>
      </div>

      <div className="space-y-3 mb-4">
        {actions.map((a, i) => (
          <ActionForm
            key={a._key}
            action={a}
            index={i}
            total={actions.length}
            onChange={updated => updateAction(i, updated)}
            onRemove={() => removeAction(i)}
            onMove={dir => moveAction(i, dir)}
          />
        ))}
      </div>

      <button
        onClick={() => setActions(prev => [...prev, emptyAction()])}
        className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-emerald-300 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={15} />
        Add Action
      </button>
    </div>
  );
}
