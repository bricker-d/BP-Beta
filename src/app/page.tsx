"use client";

import { useHealthStore } from "@/store/useHealthStore";
import { getGreeting } from "@/lib/utils";
import Header from "@/components/layout/Header";
import AlertCard from "@/components/dashboard/AlertCard";
import LabPanelCard from "@/components/dashboard/LabPanelCard";
import WearableDataCard from "@/components/dashboard/WearableDataCard";
import AICoachButton from "@/components/dashboard/AICoachButton";
import Link from "next/link";

export default function DashboardPage() {
  const { user, labPanel, wearableData, actions } = useHealthStore();

  const outOfRange = labPanel
    ? labPanel.biomarkers.filter((b) => b.status !== "optimal").length
    : 0;

  const completedActions = actions.filter((a) => a.completed).length;

  return (
    <div className="page-content bg-background min-h-screen">
      <Header />

      <div className="px-5 pt-5 space-y-5">
        {/* Greeting */}
        <div>
          <h1 className="text-[26px] font-extrabold text-text-primary leading-tight">
            {getGreeting(user.name)}
          </h1>
          <p className="text-[14px] text-text-secondary mt-1">
            Here&apos;s what matters today
          </p>
        </div>

        {/* Alert */}
        {outOfRange > 0 && <AlertCard outOfRangeCount={outOfRange} />}

        {/* Lab Panel */}
        {labPanel && <LabPanelCard panel={labPanel} />}

        {/* Wearable */}
        {wearableData && <WearableDataCard data={wearableData} />}

        {/* AI Coach */}
        <AICoachButton />

        {/* Today's Actions preview */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[17px] font-bold text-text-primary">
                Today&apos;s Actions
              </h2>
              <p className="text-[13px] text-text-secondary mt-0.5">
                Evidence-based interventions
              </p>
            </div>
            <Link
              href="/actions"
              className="text-[13px] font-semibold text-blue-500 flex items-center gap-1"
            >
              <span className="text-text-muted font-normal">
                {completedActions}/{actions.length}
              </span>
              <span className="ml-1">View</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
