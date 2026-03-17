"use client";

import { useHealthStore } from "@/store/useHealthStore";
import Header from "@/components/layout/Header";
import ActionCard from "@/components/actions/ActionCard";

export default function ActionsPage() {
  const { actions, toggleAction } = useHealthStore();

  const completed = actions.filter((a) => a.completed).length;

  return (
    <div className="page-content bg-background min-h-screen">
      <Header />

      <div className="px-5 pt-5 space-y-4">
        {/* Title */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[22px] font-extrabold text-text-primary">
              Today&apos;s Actions
            </h1>
            <p className="text-[13px] text-text-secondary mt-0.5">
              Evidence-based interventions
            </p>
          </div>
          <span className="text-[15px] font-semibold text-text-muted mt-1">
            {completed}/{actions.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full gradient-btn rounded-full transition-all duration-500"
            style={{ width: `${(completed / actions.length) * 100}%` }}
          />
        </div>

        {/* Precision targeting info */}
        <div className="bg-purple-50 rounded-2xl p-4">
          <p className="text-[13px] text-purple-600 leading-relaxed">
            <span className="font-semibold">Precision Targeting:</span> These actions
            address your specific biomarker constraints for maximum impact on healthy
            aging.
          </p>
        </div>

        {/* Action cards */}
        <div className="space-y-3">
          {actions.map((action) => (
            <ActionCard key={action.id} action={action} onToggle={toggleAction} />
          ))}
        </div>

        {/* Clinical advisory */}
        <div className="bg-gray-100 rounded-2xl p-4 mt-2">
          <p className="text-[12px] text-text-muted leading-relaxed">
            <span className="font-semibold text-text-secondary">Clinical Advisory:</span>{" "}
            These recommendations are evidence-based behavioral suggestions. Consult
            your healthcare provider before making significant changes to your health
            routine.
          </p>
        </div>
      </div>
    </div>
  );
}
