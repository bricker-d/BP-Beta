"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ChevronDown, ChevronUp, Save, Loader2 } from "lucide-react";
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
  const [expanded, setExpanded] = useState(false);

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
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex flex-col gap-0.5">
          <button onClick={() => onMove(-1)} disabled={index === 0} className="disabled:opacity-30 text-gray-400 hover:text-gray-600">
            <ChevronUp size={13} />
          </button>
          <button onClick={() => onMove(1)} disabled={index === total - 1} className="disabled:opacity-30 text-gray-400 hover:text-gray-600">
            <ChevronDown size={13} />
          </button>
        </div>
        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
          {index + 1}
        </span>
        <input
          value={action.title}
          onChange={e => onChange({ ...action, title: e.target.value })}
          placeholder="Action title"
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
                  placeholder="Threshold"
                  className="w-28 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function EditProtocolPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [targetConditions, setTargetConditions] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [actions, setActions] = useState<DraftAction[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    params.then(async ({ id: resolvedId }) => {
      setId(resolvedId);
      const res = await fetch(`/api/protocols/${resolvedId}`);
      if (!res.ok) { router.push("/practitioner/protocols"); return; }
      const data = await res.json();
      setName(data.name ?? "");
      setDescription(data.description ?? "");
      setFocusAreas(data.focus_areas ?? []);
      setTargetConditions((data.target_conditions ?? []).join(", "));
      setAgeMin(data.target_age_min?.toString() ?? "");
      setAgeMax(data.target_age_max?.toString() ?? "");
      const loaded: DraftAction[] = (data.protocol_actions ?? []).map((a: Record<string, unknown>) => ({
        _key: Math.random().toString(36).slice(2),
        title: a.title ?? "",
        description: a.description ?? "",
        mechanism: a.mechanism ?? "",
        category: a.category ?? "Lifestyle",
        time_of_day: a.time_of_day ?? "morning",
        biomarker_targets: a.biomarker_targets ?? [],
        evidence_grade: a.evidence_grade ?? "B",
        effect_size: a.effect_size ?? "",
        time_to_effect: a.time_to_effect ?? "",
        citations: a.citations ?? [],
        is_conditional: a.is_conditional ?? false,
        condition_biomarker: a.condition_biomarker as string | undefined,
        condition_operator: a.condition_operator as "below" | "above" | undefined,
        condition_threshold: a.condition_threshold as number | undefined,
        sort_order: a.sort_order as number ?? 0,
      }));
      setActions(loaded.length ? loaded : [emptyAction()]);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  async function save() {
    if (!name.trim() || !id) return;
    setSaving(true);
    const res = await fetch(`/api/protocols/${id}`, {
      method: "PUT",
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600 mb-1">
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Edit Protocol</h1>
        </div>
        <button
          onClick={save}
          disabled={saving || !name.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-40 transition-colors"
        >
          <Save size={14} />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

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
            rows={2}
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 resize-none"
          />
        </div>

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
          <div className="col-span-1">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Target Conditions</label>
            <input
              value={targetConditions}
              onChange={e => setTargetConditions(e.target.value)}
              placeholder="e.g. T2D, obesity"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Min Age</label>
            <input
              type="number"
              value={ageMin}
              onChange={e => setAgeMin(e.target.value)}
              placeholder="30"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Max Age</label>
            <input
              type="number"
              value={ageMax}
              onChange={e => setAgeMax(e.target.value)}
              placeholder="65"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3 mb-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Actions</h2>
          <span className="text-xs text-gray-400">{actions.filter(a => a.title.trim()).length} action{actions.filter(a => a.title.trim()).length !== 1 ? "s" : ""}</span>
        </div>
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
        <button
          onClick={() => setActions(prev => [...prev, emptyAction()])}
          className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-emerald-300 hover:text-emerald-600 flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={14} /> Add Action
        </button>
      </div>
    </div>
  );
}
