"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { useHealthStore } from "@/store/useHealthStore";
import {
  isNotificationsSupported,
  isNotificationsGranted,
  requestNotificationPermission,
  registerServiceWorker,
  scheduleDailyNotifications,
} from "@/lib/notifications";

export default function NotificationBanner() {
  const { intakeProfile, actions, streak } = useHealthStore();
  const [show, setShow]         = useState(false);
  const [granted, setGranted]   = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isNotificationsSupported()) return;
    const alreadyGranted = isNotificationsGranted();
    setGranted(alreadyGranted);

    const wasDismissed = localStorage.getItem("bp_notif_banner_dismissed") === "1";
    if (!wasDismissed && !alreadyGranted && Notification.permission !== "denied") {
      // Show banner after a brief delay (let the page settle)
      const t = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(t);
    }

    if (alreadyGranted) {
      // Already have permission — quietly schedule notifications
      scheduleAll();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-schedule whenever actions or streak changes
  useEffect(() => {
    if (granted) scheduleAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions, streak, granted]);

  async function scheduleAll() {
    if (!isNotificationsGranted()) return;
    const reg = await registerServiceWorker();

    const pending = actions.filter(a => !a.completed);
    const top = pending[0] ?? actions[0];
    if (!top) return;

    const ctx = {
      name: intakeProfile?.name?.split(" ")[0] ?? "there",
      style: (intakeProfile?.notificationStyle as "gentle" | "direct" | "blunt") ?? "direct",
      topActionTitle: top.title,
      topActionTarget: top.biomarkerTarget ?? "",
      completedCount: actions.filter(a => a.completed).length,
      totalActions: actions.length,
      streak,
      topBiomarker: top.targetBiomarkers?.[0] ?? "",
    };

    scheduleDailyNotifications(ctx, {
      morningTime: intakeProfile?.checkInTime ?? "7:00 am",
      eveningTime: intakeProfile?.eveningReminderTime ?? "7:00 pm",
      reg,
    });
  }

  async function handleEnable() {
    const permission = await requestNotificationPermission();
    if (permission === "granted") {
      setGranted(true);
      setShow(false);
      await scheduleAll();
    } else {
      setShow(false);
      localStorage.setItem("bp_notif_banner_dismissed", "1");
    }
  }

  function handleDismiss() {
    setShow(false);
    setDismissed(true);
    localStorage.setItem("bp_notif_banner_dismissed", "1");
  }

  if (!show || dismissed || granted) return null;

  return (
    <div
      className="rounded-2xl px-4 py-4"
      style={{
        background: "linear-gradient(135deg, rgba(91,79,233,0.08), rgba(99,102,241,0.06))",
        border: "1px solid var(--accent-mid)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--accent-lo)" }}>
            <Bell size={16} color="var(--accent)" />
          </div>
          <div>
            <p className="text-[14px] font-semibold" style={{ color: "var(--text1)" }}>
              Stay on track with reminders
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--text2)", lineHeight: 1.5 }}>
              Morning check-in at {intakeProfile?.checkInTime ?? "7:00 am"} and evening nudge at {intakeProfile?.eveningReminderTime ?? "7:00 pm"} — personalized to your protocol.
            </p>
          </div>
        </div>
        <button onClick={handleDismiss} className="flex-shrink-0 mt-0.5">
          <X size={14} color="var(--text3)" />
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleEnable}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          <Bell size={13} /> Enable reminders
        </button>
        <button
          onClick={handleDismiss}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[13px] font-medium"
          style={{ background: "var(--surface2)", color: "var(--text2)" }}
        >
          <BellOff size={13} /> Not now
        </button>
      </div>
    </div>
  );
}
