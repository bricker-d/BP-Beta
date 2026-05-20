"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { TrendingUp, TrendingDown, Minus, Users, Activity, FlaskConical } from "lucide-react";

interface SnapshotRow {
  user_id: string;
  protocol_id: string;
  snapshot_day: number;
  adherence_rate: number | null;
  biomarker_deltas: Record<string, number> | null;
  protocol_name: string;
}

interface ProtocolSummary {
  protocol_id: string;
  protocol_name: string;
  milestones: {
    day: number;
    patient_count: number;
    avg_adherence: number | null;
    avg_deltas: Record<string, number>;
  }[];
}

const BIOMARKER_LABELS: Record<string, string> = {
  ldl_cholesterol:  "LDL",
  hdl_cholesterol:  "HDL",
  triglycerides:    "Triglycerides",
  fasting_glucose:  "Glucose",
  hba1c:            "HbA1c",
  crp:              "CRP",
  testosterone:     "Testosterone",
  vitamin_d:        "Vitamin D",
  tsh:              "TSH",
  cortisol:         "Cortisol",
  insulin:          "Insulin",
};

function deltaColor(delta: number, biomarkerId: string): string {
  // Biomarkers where lower is better
  const lowerBetter = ["ldl_cholesterol", "triglycerides", "fasting_glucose", "hba1c", "crp", "cortisol", "insulin", "tsh"];
  const isGood = lowerBetter.includes(biomarkerId) ? delta < 0 : delta > 0;
  if (Math.abs(delta) < 0.5) return "text-gray-400";
  return isGood ? "text-emerald-600" : "text-red-500";
}

function DeltaIcon({ delta }: { delta: number }) {
  if (Math.abs(delta) < 0.5) return <Minus size={12} className="text-gray-400" />;
  return delta > 0
    ? <TrendingUp size={12} />
    : <TrendingDown size={12} />;
}

function AdherenceRing({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-gray-300 text-sm">—</span>;
  const r = 18;
  const circ = 2 * Math.PI * r;
  const color = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
      <svg className="-rotate-90" width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#f3f4f6" strokeWidth="3.5" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="3.5"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} strokeLinecap="round" />
      </svg>
      <span className="absolute text-[10px] font-bold" style={{ color }}>{Math.round(pct)}%</span>
    </div>
  );
}

function MilestoneCard({ day, patient_count, avg_adherence, avg_deltas }: {
  day: number;
  patient_count: number;
  avg_adherence: number | null;
  avg_deltas: Record<string, number>;
}) {
  const deltaEntries = Object.entries(avg_deltas).filter(([, v]) => v !== null && !isNaN(v));

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex-1 min-w-[160px]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Day {day}</span>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Users size={11} />
          <span>{patient_count}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <AdherenceRing pct={avg_adherence} />
        <div>
          <p className="text-xs text-gray-500">Adherence</p>
          <p className="text-sm font-semibold text-gray-800">
            {avg_adherence !== null ? `${Math.round(avg_adherence)}%` : "—"}
          </p>
        </div>
      </div>

      {deltaEntries.length > 0 && (
        <div className="border-t border-gray-50 pt-3 space-y-1.5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <FlaskConical size={10} />
            Biomarker changes
          </p>
          {deltaEntries.slice(0, 4).map(([id, delta]) => (
            <div key={id} className={`flex items-center justify-between text-xs ${deltaColor(delta, id)}`}>
              <span className="text-gray-600">{BIOMARKER_LABELS[id] ?? id}</span>
              <span className={`flex items-center gap-0.5 font-semibold ${deltaColor(delta, id)}`}>
                <DeltaIcon delta={delta} />
                {delta > 0 ? "+" : ""}{delta.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProtocolOutcomesCard({ summary }: { summary: ProtocolSummary }) {
  return (
    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 mb-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
          <Activity size={15} className="text-emerald-600" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{summary.protocol_name}</p>
          <p className="text-xs text-gray-400">
            {summary.milestones.reduce((s, m) => s + m.patient_count, 0)} patients with milestone data
          </p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        {summary.milestones.map(m => (
          <MilestoneCard key={m.day} {...m} />
        ))}
      </div>
    </div>
  );
}

export default function OutcomesPage() {
  const router  = useRouter();
  const [summaries, setSummaries] = useState<ProtocolSummary[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [orgName,   setOrgName]   = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/practitioner/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, organization_id, organizations(name)")
        .eq("id", session.user.id)
        .single();

      if (!profile?.organization_id) { setLoading(false); return; }

      const org = profile.organizations as unknown as { name: string } | null;
      setOrgName(org?.name ?? null);

      // Fetch all snapshots for this org, join protocol name
      const { data: rows } = await supabase
        .from("outcomes_snapshots")
        .select("user_id, protocol_id, snapshot_day, adherence_rate, biomarker_deltas, protocols_v2(name)")
        .eq("organization_id", profile.organization_id)
        .order("snapshot_day", { ascending: true });

      if (!rows || rows.length === 0) { setLoading(false); return; }

      // Group by protocol → milestone day
      const byProtocol: Record<string, SnapshotRow[]> = {};
      for (const row of rows) {
        const proto = row.protocols_v2 as unknown as { name: string } | null;
        const key   = row.protocol_id as string;
        if (!byProtocol[key]) byProtocol[key] = [];
        byProtocol[key].push({
          user_id:          row.user_id as string,
          protocol_id:      key,
          snapshot_day:     row.snapshot_day as number,
          adherence_rate:   row.adherence_rate as number | null,
          biomarker_deltas: row.biomarker_deltas as Record<string, number> | null,
          protocol_name:    proto?.name ?? "Unknown protocol",
        });
      }

      const result: ProtocolSummary[] = Object.entries(byProtocol).map(([proto_id, snapshots]) => {
        const byDay: Record<number, SnapshotRow[]> = {};
        for (const s of snapshots) {
          if (!byDay[s.snapshot_day]) byDay[s.snapshot_day] = [];
          byDay[s.snapshot_day].push(s);
        }

        const milestones = [30, 60, 90]
          .filter(d => byDay[d]?.length > 0)
          .map(day => {
            const group = byDay[day];
            const withAdherence = group.filter(s => s.adherence_rate !== null);
            const avg_adherence = withAdherence.length > 0
              ? withAdherence.reduce((s, r) => s + (r.adherence_rate ?? 0), 0) / withAdherence.length
              : null;

            // Average each biomarker delta across patients
            const deltaAccum: Record<string, { sum: number; n: number }> = {};
            for (const s of group) {
              for (const [bid, val] of Object.entries(s.biomarker_deltas ?? {})) {
                if (!deltaAccum[bid]) deltaAccum[bid] = { sum: 0, n: 0 };
                deltaAccum[bid].sum += val;
                deltaAccum[bid].n   += 1;
              }
            }
            const avg_deltas: Record<string, number> = {};
            for (const [bid, { sum, n }] of Object.entries(deltaAccum)) {
              avg_deltas[bid] = Math.round((sum / n) * 10) / 10;
            }

            return { day, patient_count: group.length, avg_adherence, avg_deltas };
          });

        return { protocol_id: proto_id, protocol_name: snapshots[0].protocol_name, milestones };
      });

      setSummaries(result);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-gray-900">Outcomes</h1>
        <p className="text-sm text-gray-500 mt-1">
          Aggregate adherence and biomarker response at 30, 60, and 90 days.
          {orgName && <span className="font-medium text-gray-700"> {orgName}.</span>}
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="w-4 h-4 border-2 border-gray-200 border-t-emerald-500 rounded-full animate-spin" />
          Loading outcomes…
        </div>
      )}

      {!loading && summaries.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <Activity size={36} className="text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-gray-700 mb-1">No milestone data yet</p>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            Outcomes snapshots are recorded automatically when a patient reaches day 30, 60, or 90 of an active protocol.
          </p>
        </div>
      )}

      {summaries.map(s => (
        <ProtocolOutcomesCard key={s.protocol_id} summary={s} />
      ))}
    </div>
  );
}
