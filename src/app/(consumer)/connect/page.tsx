"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Watch, ExternalLink } from "lucide-react";

const DEVICES = [
  {
    name: "Oura Ring",
    description: "Sleep, HRV, readiness, and activity data",
    status: "Coming soon",
  },
  {
    name: "WHOOP",
    description: "Recovery, strain, and sleep performance",
    status: "Coming soon",
  },
  {
    name: "Apple Health",
    description: "Steps, heart rate, sleep, and workouts",
    status: "Coming soon",
  },
  {
    name: "Garmin",
    description: "Activity, HRV, and performance metrics",
    status: "Coming soon",
  },
];

export default function ConnectPage() {
  const router = useRouter();

  return (
    <div className="page-content min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-12 pb-5">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <ArrowLeft size={15} color="var(--text2)" />
        </button>
        <div>
          <h1 className="text-[20px] font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.02em" }}>
            Wearable Devices
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--text2)" }}>
            Sync real-time signals to your protocol
          </p>
        </div>
      </div>

      <div className="px-5 space-y-4">
        {/* Context card */}
        <div
          className="rounded-2xl px-4 py-4"
          style={{ background: "var(--accent-lo)", border: "1px solid rgba(124,58,237,0.15)" }}
        >
          <div className="flex items-start gap-3">
            <Watch size={18} color="var(--accent)" className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[13px] font-semibold" style={{ color: "var(--text1)" }}>
                Wearables are supplementary
              </p>
              <p className="text-[12px] mt-1" style={{ color: "var(--text2)", lineHeight: 1.55 }}>
                Your protocol is built from your lab data. Wearable signals like HRV, sleep, and steps give the AI coach additional context to personalize daily recommendations.
              </p>
            </div>
          </div>
        </div>

        {/* Device list */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          {DEVICES.map((device, i) => (
            <div key={device.name}>
              <div className="flex items-center justify-between px-4 py-4">
                <div>
                  <p className="text-[14px] font-semibold" style={{ color: "var(--text1)" }}>
                    {device.name}
                  </p>
                  <p className="text-[12px] mt-0.5" style={{ color: "var(--text2)" }}>
                    {device.description}
                  </p>
                </div>
                <span
                  className="text-[11px] font-semibold px-3 py-1 rounded-full flex-shrink-0"
                  style={{ background: "var(--accent-lo)", color: "var(--accent)" }}
                >
                  {device.status}
                </span>
              </div>
              {i < DEVICES.length - 1 && (
                <div style={{ height: 1, background: "var(--border)", marginLeft: 16 }} />
              )}
            </div>
          ))}
        </div>

        {/* Notify me */}
        <div
          className="rounded-2xl px-4 py-4 flex items-center justify-between"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div>
            <p className="text-[14px] font-semibold" style={{ color: "var(--text1)" }}>
              Get notified when available
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--text2)" }}>
              We will let you know when wearable sync launches
            </p>
          </div>
          <ExternalLink size={15} color="var(--text3)" />
        </div>
      </div>
    </div>
  );
}
