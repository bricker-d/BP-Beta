"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronRight, Trash2 } from "lucide-react";
import { Protocol } from "@/lib/types";

const FOCUS_COLORS: Record<string, string> = {
  metabolic:  "bg-orange-50 text-orange-700",
  hormones:   "bg-purple-50 text-purple-700",
  cognitive:  "bg-blue-50 text-blue-700",
  longevity:  "bg-emerald-50 text-emerald-700",
  sleep:      "bg-indigo-50 text-indigo-700",
  cardiac:    "bg-red-50 text-red-700",
  weight:     "bg-amber-50 text-amber-700",
};

export default function ProtocolsPage() {
  const router = useRouter();
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/protocols");
    if (res.ok) setProtocols(await res.json());
    setLoading(false);
  }

  async function deleteProtocol(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this protocol?")) return;
    await fetch(`/api/protocols/${id}`, { method: "DELETE" });
    setProtocols(ps => ps.filter(p => p.id !== id));
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Protocol Library</h1>
          <p className="text-sm text-gray-500 mt-0.5">Build and manage your clinical protocol templates</p>
        </div>
        <button
          onClick={() => router.push("/practitioner/protocols/new")}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
        >
          <Plus size={15} />
          New Protocol
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading...</div>
      ) : protocols.length === 0 ? (
        <div className="py-20 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">No protocols yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">Create your first protocol template to assign to patients</p>
          <button
            onClick={() => router.push("/practitioner/protocols/new")}
            className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700"
          >
            Create Protocol
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {protocols.map(p => (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex items-center gap-4 hover:border-gray-200 cursor-pointer transition-all group"
              onClick={() => router.push(`/practitioner/protocols/${p.id}`)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-900">{p.name}</p>
                  {!p.is_active && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Draft</span>
                  )}
                </div>
                {p.description && (
                  <p className="text-sm text-gray-500 truncate mb-2">{p.description}</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {(p.focus_areas ?? []).map(f => (
                    <span key={f} className={`text-xs font-medium px-2 py-0.5 rounded-full ${FOCUS_COLORS[f] ?? "bg-gray-100 text-gray-600"}`}>
                      {f}
                    </span>
                  ))}
                  {(p.target_conditions ?? []).map(c => (
                    <span key={c} className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      {c}
                    </span>
                  ))}
                  {p.actions?.length !== undefined && (
                    <span className="text-xs text-gray-400 px-2 py-0.5">
                      {p.actions.length} action{p.actions.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={e => deleteProtocol(p.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                >
                  <Trash2 size={14} />
                </button>
                <ChevronRight size={16} className="text-gray-300" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
