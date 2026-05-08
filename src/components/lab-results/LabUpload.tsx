"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, FileSpreadsheet, X, CheckCircle, Loader2, AlertCircle, Pencil, Check, FlaskConical } from "lucide-react";
import { useHealthStore } from "@/store/useHealthStore";
import { LabPanel, Biomarker } from "@/lib/types";
import { getBiomarkerStatus } from "@/lib/biomarkers";

// ── Sample data for demo / investor mode ─────────────────────────────────────
const SAMPLE_PANEL: LabPanel = {
  id: `sample-${Date.now()}`,
  date: new Date().toISOString(),
  source: "Quest Diagnostics",
  biomarkers: [
    { id: "glucose",        name: "Fasting Glucose",     shortName: "Glucose",      value: 94,   unit: "mg/dL",    status: "borderline", category: "metabolic",    optimalMin: 70,  optimalMax: 85  },
    { id: "hba1c",          name: "HbA1c",               shortName: "HbA1c",        value: 5.7,  unit: "%",        status: "borderline", category: "metabolic",    optimalMin: 4.8, optimalMax: 5.4 },
    { id: "fastingInsulin", name: "Fasting Insulin",     shortName: "Insulin",      value: 8.4,  unit: "μIU/mL",  status: "borderline", category: "metabolic",    optimalMin: 2,   optimalMax: 6   },
    { id: "ldl",            name: "LDL Cholesterol",     shortName: "LDL",          value: 142,  unit: "mg/dL",   status: "elevated",   category: "lipid",        optimalMin: 0,   optimalMax: 100 },
    { id: "hdl",            name: "HDL Cholesterol",     shortName: "HDL",          value: 46,   unit: "mg/dL",   status: "borderline", category: "lipid",        optimalMin: 60,  optimalMax: 80  },
    { id: "triglycerides",  name: "Triglycerides",       shortName: "Trigs",        value: 162,  unit: "mg/dL",   status: "elevated",   category: "lipid",        optimalMin: 0,   optimalMax: 100 },
    { id: "hscrp",          name: "hsCRP",               shortName: "hsCRP",        value: 2.1,  unit: "mg/L",    status: "borderline", category: "inflammatory", optimalMin: 0,   optimalMax: 1   },
    { id: "testosterone",   name: "Total Testosterone",  shortName: "Testosterone", value: 498,  unit: "ng/dL",   status: "borderline", category: "hormone",      optimalMin: 700, optimalMax: 900 },
    { id: "cortisol",       name: "Cortisol (AM)",       shortName: "Cortisol",     value: 22,   unit: "μg/dL",   status: "elevated",   category: "hormone",      optimalMin: 6,   optimalMax: 18  },
    { id: "vitaminD",       name: "Vitamin D",           shortName: "Vit D",        value: 28,   unit: "ng/mL",   status: "low",        category: "vitamin",      optimalMin: 60,  optimalMax: 80  },
    { id: "magnesium",      name: "Magnesium",           shortName: "Mag",          value: 1.9,  unit: "mg/dL",   status: "borderline", category: "vitamin",      optimalMin: 2.0, optimalMax: 2.5 },
    { id: "omega3Index",    name: "Omega-3 Index",       shortName: "Omega-3",      value: 4.1,  unit: "%",       status: "low",        category: "vitamin",      optimalMin: 8,   optimalMax: 12  },
    { id: "vitaminB12",     name: "Vitamin B12",         shortName: "B12",          value: 652,  unit: "pg/mL",   status: "optimal",    category: "vitamin",      optimalMin: 500, optimalMax: 900 },
    { id: "ferritin",       name: "Ferritin",            shortName: "Ferritin",     value: 72,   unit: "ng/mL",   status: "optimal",    category: "vitamin",      optimalMin: 50,  optimalMax: 150 },
  ] as Biomarker[],
};

type UploadState = "idle" | "dragging" | "uploading" | "parsing" | "confirming" | "success" | "error";

const LAB_SOURCES = ["Quest Diagnostics", "LabCorp", "Rupa Health", "Function Health", "Ulta Lab Tests", "Other"];

const CATEGORY_ORDER = ["metabolic", "lipid", "inflammatory", "hormone", "thyroid", "vitamin", "cbc", "kidney", "liver", "nutrition"];
const CATEGORY_LABELS: Record<string, string> = {
  metabolic: "Metabolic", lipid: "Lipids", inflammatory: "Inflammation",
  hormone: "Hormones", thyroid: "Thyroid", vitamin: "Vitamins & Minerals",
  cbc: "Blood (CBC)", kidney: "Kidney", liver: "Liver", nutrition: "Nutrition",
};

const STATUS_STYLES = {
  optimal:    { color: "#059669", bg: "rgba(5,150,105,0.08)",   label: "Optimal"    },
  elevated:   { color: "#DC2626", bg: "rgba(220,38,38,0.08)",   label: "Elevated"   },
  low:        { color: "#DC2626", bg: "rgba(220,38,38,0.08)",   label: "Low"        },
  borderline: { color: "#D97706", bg: "rgba(217,119,6,0.08)",   label: "Borderline" },
};

// ── Editable biomarker row ────────────────────────────────────────────────────

function BiomarkerRow({ b, onChange }: {
  b: Biomarker;
  onChange: (id: string, value: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(b.value));
  const st = STATUS_STYLES[b.status] ?? STATUS_STYLES.borderline;

  function commit() {
    const num = parseFloat(draft);
    if (!isNaN(num) && num > 0) onChange(b.id, num);
    setEditing(false);
  }

  return (
    <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium truncate" style={{ color: "var(--text1)" }}>{b.name}</p>
        <p className="text-[11px]" style={{ color: "var(--text3)" }}>
          Optimal: {b.optimalMin}–{b.optimalMax} {b.unit}
        </p>
      </div>

      {editing ? (
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            type="number"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => e.key === "Enter" && commit()}
            className="w-20 text-right text-[14px] font-semibold rounded-lg px-2 py-1"
            style={{ border: "1.5px solid var(--accent)", outline: "none", background: "var(--surface)", color: "var(--text1)" }}
          />
          <span className="text-[11px]" style={{ color: "var(--text3)" }}>{b.unit}</span>
          <button onClick={commit} style={{ color: "var(--green)" }}>
            <Check size={14} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: st.bg, color: st.color }}>
            {st.label}
          </span>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-[13px] font-semibold"
            style={{ color: "var(--text1)", minWidth: 52, textAlign: "right" }}
          >
            {b.value}
            <Pencil size={10} color="var(--text3)" />
          </button>
          <span className="text-[11px]" style={{ color: "var(--text3)", minWidth: 32 }}>{b.unit}</span>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function LabUpload() {
  const [state, setState]         = useState<UploadState>("idle");
  const [source, setSource]       = useState("Quest Diagnostics");
  const [fileName, setFileName]   = useState("");
  const [errorMsg, setErrorMsg]   = useState("");
  const [pendingPanel, setPending] = useState<LabPanel | null>(null);
  const [editedBiomarkers, setEdited] = useState<Biomarker[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { setLabPanel, patientId, labPanel: existingPanel } = useHealthStore();

  async function handleFile(rawFile: File) {
    const allowed = ["application/pdf", "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel"];
    if (!allowed.includes(rawFile.type) && !rawFile.name.endsWith(".csv")) {
      setErrorMsg("Please upload a PDF, Excel (.xlsx), or CSV file.");
      setState("error"); return;
    }

    setFileName(rawFile.name);
    setState("uploading");
    await new Promise(r => setTimeout(r, 600));
    setState("parsing");

    try {
      const fd = new FormData();
      fd.append("file", rawFile);
      fd.append("source", source);
      if (patientId) fd.append("patientId", patientId);
      const res = await fetch("/api/parse-labs", { method: "POST", body: fd });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? "Parsing failed"); }
      const { panel } = await res.json() as { panel: LabPanel };

      if (!panel?.biomarkers?.length) throw new Error("No biomarkers detected. Check that the file contains lab values.");

      setPending(panel);
      setEdited(panel.biomarkers);
      setState("confirming");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Parsing failed");
      setState("error");
    }
  }

  function handleValueChange(id: string, newValue: number) {
    setEdited(prev => prev.map(b =>
      b.id === id
        ? { ...b, value: newValue, status: getBiomarkerStatus(newValue, b.optimalMin, b.optimalMax) }
        : b
    ));
  }

  function confirm() {
    if (!pendingPanel) return;
    const isSecondPanel = !!existingPanel;
    const confirmed: LabPanel = { ...pendingPanel, biomarkers: editedBiomarkers };
    setLabPanel(confirmed);
    setState("success");
    if (isSecondPanel) {
      setTimeout(() => router.push("/lab-results/delta"), 800);
    }
  }

  function reset() {
    setState("idle"); setFileName(""); setErrorMsg(""); setPending(null); setEdited([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function loadSampleData() {
    const panel = { ...SAMPLE_PANEL, id: `sample-${Date.now()}` };
    setPending(panel);
    setEdited(panel.biomarkers);
    setFileName("Sample Lab Report");
    setSource("Quest Diagnostics");
    setState("confirming");
  }

  // Group biomarkers by category for the confirmation screen
  const grouped = CATEGORY_ORDER.map(cat => ({
    cat,
    markers: editedBiomarkers.filter(b => b.category === cat),
  })).filter(g => g.markers.length > 0);
  // Catch uncategorized
  const knownCats = new Set(CATEGORY_ORDER);
  const other = editedBiomarkers.filter(b => !knownCats.has(b.category));
  if (other.length) grouped.push({ cat: "other", markers: other });

  const outCount = editedBiomarkers.filter(b => b.status !== "optimal").length;

  // ── Idle / error ─────────────────────────────────────────────────────────────
  if (state === "idle" || state === "dragging" || state === "error") return (
    <div className="space-y-4">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text2)" }}>
          Lab provider
        </p>
        <div className="flex gap-2 flex-wrap">
          {LAB_SOURCES.map(s => (
            <button key={s} onClick={() => setSource(s)}
              className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all"
              style={{
                background: source === s ? "var(--accent-lo)" : "var(--surface)",
                border: `1.5px solid ${source === s ? "var(--accent)" : "var(--border)"}`,
                color: source === s ? "var(--accent)" : "var(--text2)",
              }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setState("dragging"); }}
        onDragLeave={() => setState("idle")}
        onDrop={e => { e.preventDefault(); setState("idle"); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => fileInputRef.current?.click()}
        className="rounded-2xl border-2 border-dashed p-8 flex flex-col items-center gap-3 cursor-pointer transition-all"
        style={{
          borderColor: state === "dragging" ? "var(--accent)" : state === "error" ? "var(--red)" : "var(--border)",
          background: state === "dragging" ? "var(--accent-lo)" : state === "error" ? "rgba(220,38,38,0.04)" : "var(--surface)",
        }}
      >
        <input ref={fileInputRef} type="file" accept=".pdf,.xlsx,.xls,.csv" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} className="hidden" />
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--accent-lo)" }}>
          <Upload size={24} color="var(--accent)" />
        </div>
        <div className="text-center">
          <p className="text-[15px] font-semibold" style={{ color: "var(--text1)" }}>
            {state === "dragging" ? "Drop it here" : "Upload Lab Report"}
          </p>
          <p className="text-[13px] mt-1" style={{ color: "var(--text2)" }}>PDF, Excel, or CSV from Quest, LabCorp, Rupa & more</p>
          <p className="text-[12px] mt-1.5" style={{ color: "var(--text3)" }}>Tap to browse or drag and drop</p>
        </div>
        {state === "error" && (
          <div className="flex items-center gap-2 mt-1">
            <AlertCircle size={14} color="var(--red)" />
            <p className="text-[13px] font-medium" style={{ color: "var(--red)" }}>{errorMsg}</p>
          </div>
        )}
      </div>
      <div className="flex gap-4 text-[11px]" style={{ color: "var(--text3)" }}>
        <div className="flex items-center gap-1"><FileText size={11} /><span>PDF reports</span></div>
        <div className="flex items-center gap-1"><FileSpreadsheet size={11} /><span>Excel / CSV</span></div>
      </div>

      <div className="flex items-center gap-3">
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <span className="text-[11px] font-medium" style={{ color: "var(--text3)" }}>or</span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>

      <button
        onClick={loadSampleData}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold transition-opacity active:opacity-70"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text2)" }}
      >
        <FlaskConical size={14} color="var(--accent)" />
        Try with sample lab data
      </button>
      <p className="text-[11px] text-center" style={{ color: "var(--text3)" }}>
        14 realistic biomarkers — see exactly what BioPrecision does with your results
      </p>
    </div>
  );

  // ── Uploading / parsing ───────────────────────────────────────────────────────
  if (state === "uploading" || state === "parsing") return (
    <div className="rounded-2xl px-4 py-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-lo)" }}>
          <FileText size={18} color="var(--accent)" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold truncate" style={{ color: "var(--text1)" }}>{fileName}</p>
          <p className="text-[12px]" style={{ color: "var(--text3)" }}>{source}</p>
        </div>
        <Loader2 size={18} color="var(--accent)" className="animate-spin flex-shrink-0" />
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: state === "uploading" ? "35%" : "80%", background: "var(--accent)" }} />
      </div>
      <p className="text-[12px] mt-2" style={{ color: "var(--text3)" }}>
        {state === "uploading" ? "Reading file..." : "AI extracting biomarkers — identifying glucose, lipids, hormones, vitamins..."}
      </p>
    </div>
  );

  // ── Confirming ────────────────────────────────────────────────────────────────
  if (state === "confirming") return (
    <div className="space-y-4 step-enter">
      {/* Header */}
      <div className="rounded-2xl px-4 py-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(5,150,105,0.1)" }}>
            <CheckCircle size={18} color="var(--green)" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold" style={{ color: "var(--text1)" }}>
              {editedBiomarkers.length} biomarkers detected
            </p>
            <p className="text-[12px]" style={{ color: "var(--text2)" }}>
              {fileName} · {outCount > 0 ? `${outCount} out of range` : "all in optimal range"}
            </p>
          </div>
          <button onClick={reset}>
            <X size={16} color="var(--text3)" />
          </button>
        </div>
      </div>

      {/* Instruction */}
      <div className="flex items-start gap-2.5 px-1">
        <Pencil size={13} color="var(--accent)" className="mt-0.5 flex-shrink-0" />
        <p className="text-[12px]" style={{ color: "var(--text2)", lineHeight: 1.5 }}>
          Review the values below. Tap any number to correct it if it doesn&apos;t match your report.
        </p>
      </div>

      {/* Biomarker list grouped by category */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        {grouped.map(({ cat, markers }, gi) => (
          <div key={cat}>
            {gi > 0 && <div style={{ height: 1, background: "var(--border)" }} />}
            <div className="px-4 pt-3 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text3)" }}>
                {CATEGORY_LABELS[cat] ?? cat}
              </p>
            </div>
            <div className="px-4">
              {markers.map(b => (
                <BiomarkerRow key={b.id} b={b} onChange={handleValueChange} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Confirm */}
      <button className="btn-primary" onClick={confirm}>
        <CheckCircle size={16} /> Looks correct — build my protocol
      </button>
      <button className="btn-ghost" onClick={reset}>Upload a different file</button>
    </div>
  );

  // ── Success ───────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl px-4 py-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(5,150,105,0.1)" }}>
          <CheckCircle size={18} color="var(--green)" />
        </div>
        <div className="flex-1">
          <p className="text-[14px] font-semibold" style={{ color: "var(--text1)" }}>Lab results saved</p>
          <p className="text-[12px]" style={{ color: "var(--text2)" }}>{fileName} · {source}</p>
        </div>
        <button onClick={reset}><X size={16} color="var(--text3)" /></button>
      </div>
    </div>
  );
}
