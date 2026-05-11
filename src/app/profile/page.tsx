"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHealthStore } from "@/store/useHealthStore";
import Header from "@/components/layout/Header";
import { Edit3, ChevronRight, Bell, BellOff, Check, Fingerprint, ShieldCheck, ShieldOff } from "lucide-react";
import {
  isNotificationsSupported,
  isNotificationsGranted,
  requestNotificationPermission,
  registerServiceWorker,
  scheduleDailyNotifications,
} from "@/lib/notifications";
import {
  isBiometricSupported,
  isBiometricEnrolled,
  enrollBiometric,
  clearBiometricEnrollment,
} from "@/lib/webauthn";

const GOAL_META: Record<string, { label: string }> = {
  longevity:       { label: "Longevity"       },
  weight_loss:     { label: "Weight Loss"     },
  energy:          { label: "Energy"          },
  muscle_gain:     { label: "Muscle Gain"     },
  heart_health:    { label: "Heart Health"    },
  hormone_balance: { label: "Hormone Balance" },
  mental_clarity:  { label: "Mental Clarity"  },
  sleep:           { label: "Sleep"           },
};

const ALL_GOALS = Object.entries(GOAL_META);

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-[11px] font-bold uppercase tracking-widest mb-2 px-1" style={{ color: "var(--text3)" }}>
        {title}
      </p>
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, onPress, destructive }: {
  label: string; value?: string; onPress?: () => void; destructive?: boolean;
}) {
  const color = destructive ? "var(--red)" : "var(--text1)";
  return (
    <button
      onClick={onPress}
      disabled={!onPress}
      className="w-full flex items-center justify-between px-4 py-3.5"
      style={{ borderBottom: "1px solid var(--border)", cursor: onPress ? "pointer" : "default" }}
    >
      <span className="text-[14px] font-medium" style={{ color }}>{label}</span>
      <div className="flex items-center gap-2">
        {value && <span className="text-[13px]" style={{ color: "var(--text3)" }}>{value}</span>}
        {onPress && <ChevronRight size={14} color="var(--text3)" />}
      </div>
    </button>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();
  const { intakeProfile, setIntakeProfile, labPanel, actions, streak, signOut } = useHealthStore();
  const [editingGoals, setEditingGoals] = useState(false);
  const [selectedGoals, setSelectedGoals] = useState<string[]>(intakeProfile?.goals ?? []);
  const [confirmReset, setConfirmReset] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");
  const [notifLoading, setNotifLoading] = useState(false);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);

  useEffect(() => {
    if (!isNotificationsSupported()) { setNotifPermission("unsupported"); return; }
    setNotifPermission(Notification.permission);
  }, []);

  useEffect(() => {
    setBiometricSupported(isBiometricSupported());
    setBiometricEnrolled(isBiometricEnrolled());
  }, []);

  async function handleEnrollBiometric() {
    setBiometricLoading(true);
    const ok = await enrollBiometric(name);
    if (ok) setBiometricEnrolled(true);
    setBiometricLoading(false);
  }

  function handleDisableBiometric() {
    clearBiometricEnrollment();
    setBiometricEnrolled(false);
  }

  async function handleEnableNotifications() {
    setNotifLoading(true);
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
    if (perm === "granted") {
      const reg = await registerServiceWorker();
      const pending = actions.filter(a => !a.completed);
      const top = pending[0] ?? actions[0];
      if (top) {
        scheduleDailyNotifications({
          name: intakeProfile?.name?.split(" ")[0] ?? "there",
          style: (intakeProfile?.notificationStyle as "gentle" | "direct" | "blunt") ?? "direct",
          topActionTitle: top.title,
          topActionTarget: top.biomarkerTarget ?? "",
          completedCount: actions.filter(a => a.completed).length,
          totalActions: actions.length,
          streak,
          topBiomarker: top.targetBiomarkers?.[0] ?? "",
        }, {
          morningTime: intakeProfile?.checkInTime ?? "7:00 am",
          eveningTime: intakeProfile?.eveningReminderTime ?? "7:00 pm",
          reg,
        });
      }
    }
    setNotifLoading(false);
  }

  const profile = intakeProfile;
  const name = profile?.name ?? "Your Profile";
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const doneToday = actions.filter(a => a.completed).length;

  const toggleGoal = (key: string) => {
    setSelectedGoals(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const saveGoals = () => {
    if (profile) setIntakeProfile({ ...profile, goals: selectedGoals });
    setEditingGoals(false);
  };

  const handleReset = () => {
    if (!confirmReset) { setConfirmReset(true); return; }
    useHealthStore.setState({
      intakeProfile: null,
      labPanel: null,
      labHistory: [],
      actions: [],
      messages: [],
      streak: 0,
      lastCompletedDate: null,
      completionHistory: [],
    });
    router.push("/onboarding");
  };

  return (
    <div className="page-content min-h-screen pb-24" style={{ background: "var(--bg)" }}>
      <Header title="Profile" />

      <div className="px-5 pt-5 space-y-0">

        {/* Avatar + name */}
        <div className="flex flex-col items-center py-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 text-white text-2xl font-bold"
            style={{ background: "var(--accent)" }}>
            {initials}
          </div>
          <p className="text-[22px] font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.02em" }}>
            {name}
          </p>
          {profile?.goals?.[0] && (
            <p className="text-[14px] mt-1" style={{ color: "var(--text2)" }}>
              {GOAL_META[profile.goals[0]]?.label}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { value: streak, label: "Day streak", accent: streak > 0 },
            { value: `${doneToday}/${actions.length}`, label: "Today" },
            { value: labPanel?.biomarkers.length ?? 0, label: "Biomarkers" },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center py-4 rounded-2xl"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <span className="text-[22px] font-bold" style={{ color: s.accent ? "var(--accent)" : "var(--text1)" }}>{s.value}</span>
              <span className="text-[11px] mt-0.5" style={{ color: "var(--text3)" }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Goals */}
        <Section title="Goals">
          {!editingGoals ? (
            <div className="px-4 py-3">
              <div className="flex flex-wrap gap-2 mb-3">
                {(profile?.goals ?? []).map(g => {
                  const meta = GOAL_META[g] ?? { label: g };
                  return (
                    <span key={g} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
                      style={{ background: "var(--accent-lo)", color: "var(--accent)", border: "1px solid var(--accent-mid)" }}>
                      {meta.label}
                    </span>
                  );
                })}
                {(!profile?.goals || profile.goals.length === 0) && (
                  <span className="text-[13px]" style={{ color: "var(--text3)" }}>No goals set</span>
                )}
              </div>
              <button
                onClick={() => { setSelectedGoals(profile?.goals ?? []); setEditingGoals(true); }}
                className="flex items-center gap-1.5 text-[12px] font-semibold"
                style={{ color: "var(--accent)" }}
              >
                <Edit3 size={12} /> Edit goals
              </button>
            </div>
          ) : (
            <div className="px-4 py-4">
              <div className="flex flex-wrap gap-2 mb-4">
                {ALL_GOALS.map(([key, meta]) => {
                  const active = selectedGoals.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleGoal(key)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
                      style={{
                        background: active ? "var(--accent-lo)" : "var(--surface2)",
                        color: active ? "var(--accent)" : "var(--text2)",
                        border: active ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                      }}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingGoals(false)}
                  className="flex-1 py-2.5 rounded-xl text-[14px] font-medium"
                  style={{ border: "1px solid var(--border)", color: "var(--text2)" }}>
                  Cancel
                </button>
                <button onClick={saveGoals}
                  className="flex-2 px-6 py-2.5 rounded-xl text-[14px] font-semibold text-white"
                  style={{ background: "var(--accent)" }}>
                  Save
                </button>
              </div>
            </div>
          )}
        </Section>

        {/* About you */}
        {profile && (
          <Section title="About you">
            {profile.age     && <Row label="Age"            value={`${profile.age} years`} />}
            {profile.biologicalSex && <Row label="Biological sex" value={profile.biologicalSex} />}
            {profile.weightLbs     && <Row label="Weight"         value={`${profile.weightLbs} lbs`} />}
            {profile.sleepHours    && <Row label="Sleep"          value={`${profile.sleepHours} hrs/night`} />}
            {profile.exerciseDaysPerWeek && <Row label="Exercise" value={profile.exerciseDaysPerWeek} />}
            {profile.dietStyle     && <Row label="Diet"           value={profile.dietStyle} />}
          </Section>
        )}

        {/* Lab results */}
        <Section title="Lab Results">
          {labPanel ? (
            <Row
              label={labPanel.source ?? "Lab panel"}
              value={labPanel.date}
            />
          ) : (
            <Row label="No labs uploaded yet" />
          )}
          <Row
            label="Upload new labs"
            onPress={() => router.push("/lab-results")}
          />
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          {notifPermission === "unsupported" ? (
            <div className="px-4 py-3">
              <p className="text-[13px]" style={{ color: "var(--text3)" }}>Not supported in this browser.</p>
            </div>
          ) : notifPermission === "granted" ? (
            <>
              <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2">
                  <Bell size={14} color="var(--green)" />
                  <span className="text-[14px] font-medium" style={{ color: "var(--text1)" }}>Reminders enabled</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: "rgba(52,199,89,0.1)" }}>
                  <Check size={11} color="var(--green)" />
                  <span className="text-[11px] font-semibold" style={{ color: "var(--green)" }}>On</span>
                </div>
              </div>
              <Row label="Morning check-in" value={intakeProfile?.checkInTime ?? "7:00 am"} />
              <Row label="Evening nudge" value={intakeProfile?.eveningReminderTime ?? "7:00 pm"} />
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--text3)" }}>
                  To disable, go to your browser or device notification settings and block BioPrecision.
                </p>
              </div>
            </>
          ) : notifPermission === "denied" ? (
            <div className="px-4 py-3.5">
              <div className="flex items-center gap-2 mb-1">
                <BellOff size={14} color="var(--red)" />
                <span className="text-[14px] font-medium" style={{ color: "var(--text1)" }}>Notifications blocked</span>
              </div>
              <p className="text-[12px] leading-relaxed" style={{ color: "var(--text3)" }}>
                To enable, open your browser settings → Site permissions → Notifications → allow BioPrecision.
              </p>
            </div>
          ) : (
            <div className="px-4 py-4">
              <p className="text-[13px] leading-relaxed mb-3" style={{ color: "var(--text2)" }}>
                Get a morning check-in at <strong>{intakeProfile?.checkInTime ?? "7:00 am"}</strong> and an evening nudge at <strong>{intakeProfile?.eveningReminderTime ?? "7:00 pm"}</strong> — personalized to your protocol.
              </p>
              <button
                onClick={handleEnableNotifications}
                disabled={notifLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold disabled:opacity-50"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                <Bell size={14} />
                {notifLoading ? "Requesting…" : "Enable reminders"}
              </button>
            </div>
          )}
        </Section>

        {/* Security */}
        {biometricSupported && (
          <Section title="Security">
            {biometricEnrolled ? (
              <>
                <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} color="var(--green)" />
                    <span className="text-[14px] font-medium" style={{ color: "var(--text1)" }}>Face ID / Biometrics on</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: "rgba(52,199,89,0.1)" }}>
                    <Check size={11} color="var(--green)" />
                    <span className="text-[11px] font-semibold" style={{ color: "var(--green)" }}>Active</span>
                  </div>
                </div>
                <div className="px-4 py-3.5">
                  <p className="text-[12px] leading-relaxed mb-3" style={{ color: "var(--text3)" }}>
                    Your health data is locked behind Face ID / Touch ID each session. Tap below to disable.
                  </p>
                  <button
                    onClick={handleDisableBiometric}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold"
                    style={{ border: "1px solid var(--red)", color: "var(--red)" }}
                  >
                    <ShieldOff size={14} />
                    Disable biometric lock
                  </button>
                </div>
              </>
            ) : (
              <div className="px-4 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldOff size={14} color="var(--text3)" />
                  <span className="text-[14px] font-medium" style={{ color: "var(--text1)" }}>Biometric lock off</span>
                </div>
                <p className="text-[13px] leading-relaxed mb-3" style={{ color: "var(--text2)" }}>
                  Lock your health data behind Face ID or Touch ID. You'll verify once per session.
                </p>
                <button
                  onClick={handleEnrollBiometric}
                  disabled={biometricLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  <Fingerprint size={14} />
                  {biometricLoading ? "Setting up…" : "Enable Face ID / Touch ID"}
                </button>
              </div>
            )}
          </Section>
        )}

        {/* Account */}
        <Section title="Account">
          <Row label="Privacy Policy" onPress={() => {}} />
          <Row label="Terms of Service" onPress={() => {}} />
          <Row
            label="Sign out"
            onPress={async () => {
              await signOut();
              router.replace("/auth/login");
            }}
            destructive
          />
          <Row
            label={confirmReset ? "Tap again to confirm reset" : "Reset account"}
            onPress={handleReset}
            destructive
          />
        </Section>

        <p className="text-center text-[11px] pb-2" style={{ color: "var(--text3)" }}>
          BioPrecision — not a substitute for medical advice.
        </p>
      </div>
    </div>
  );
}
