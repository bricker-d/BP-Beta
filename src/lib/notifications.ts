/**
 * BioPrecision Notification System
 * ──────────────────────────────────────────────────────────────────────────────
 * Schedules personalized daily notifications based on the patient's:
 *   - Protocol actions (specifically what they're working on)
 *   - Coaching style preference (gentle / direct / blunt)
 *   - Check-in times set during onboarding
 *   - Biomarker goals and current streak
 *
 * Works via:
 *   1. Service Worker scheduled messages (background, when SW is registered)
 *   2. setTimeout fallback (when page is open)
 *   3. Browser Notification API
 */

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  return await Notification.requestPermission();
}

export function isNotificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function isNotificationsGranted(): boolean {
  return typeof window !== "undefined" && Notification.permission === "granted";
}

// ── Service worker registration ───────────────────────────────────────────────

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return reg;
  } catch {
    return null;
  }
}

// ── Time helpers ──────────────────────────────────────────────────────────────

/** Returns ms until the next occurrence of a time string like "7:00 am" */
function msUntil(timeStr: string): number {
  const parts = timeStr.toLowerCase().split(" ");
  const [hStr, mStr] = (parts[0] ?? "7:00").split(":");
  const ampm = parts[1] ?? "am";
  let h = parseInt(hStr ?? "7", 10);
  const m = parseInt(mStr ?? "0", 10);
  if (ampm === "pm" && h !== 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;

  const now = new Date();
  const target = new Date(now);
  target.setHours(h, m, 0, 0);

  // If already passed today, schedule for tomorrow
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - now.getTime();
}

// ── Message generation ────────────────────────────────────────────────────────

type CoachingStyle = "gentle" | "direct" | "blunt";

interface NotificationContext {
  name: string;
  style: CoachingStyle;
  topActionTitle: string;
  topActionTarget: string;
  completedCount: number;
  totalActions: number;
  streak: number;
  topBiomarker: string; // e.g. "LDL" or "Vitamin D"
}

function morningTitle(ctx: NotificationContext): string {
  const { style, name } = ctx;
  if (style === "gentle") return `Good morning, ${name}`;
  if (style === "blunt")  return `${name} — protocol time`;
  return `${name}, your protocol is ready`;
}

function morningBody(ctx: NotificationContext): string {
  const { style, topActionTitle, topActionTarget, topBiomarker } = ctx;
  if (topBiomarker && style === "blunt") {
    return `${topBiomarker} is out of range. Priority: ${topActionTitle}`;
  }
  if (topActionTarget && style === "direct") {
    return `${topActionTarget} · Start: ${topActionTitle}`;
  }
  return `Today's #1 action: ${topActionTitle}`;
}

function eveningTitle(ctx: NotificationContext): string {
  const { completedCount, totalActions, style, name } = ctx;
  const allDone = completedCount >= totalActions && totalActions > 0;
  if (allDone) return style === "gentle" ? `Well done today, ${name}` : `Protocol complete`;
  return style === "gentle" ? `Evening check-in` : `${completedCount}/${totalActions} done today`;
}

function eveningBody(ctx: NotificationContext): string {
  const { completedCount, totalActions, streak, topActionTitle, style } = ctx;
  const allDone = completedCount >= totalActions && totalActions > 0;
  if (allDone && streak > 1) return `${streak} days in a row. Consistency is what moves biomarkers.`;
  if (allDone) return `All ${totalActions} actions complete. Your labs will show it.`;
  const remaining = totalActions - completedCount;
  if (style === "blunt") return `${remaining} action${remaining !== 1 ? "s" : ""} left. Next: ${topActionTitle}`;
  return `${remaining} left today — ${topActionTitle}`;
}

function middayBody(ctx: NotificationContext): string {
  const { style, topActionTitle, topActionTarget } = ctx;
  if (style === "blunt") return `Nothing checked off. ${topActionTitle} takes under 10 minutes.`;
  if (topActionTarget) return `Halfway through the day. ${topActionTarget}: ${topActionTitle}`;
  return `Quick check-in — ${topActionTitle} is still waiting.`;
}

// ── Main scheduler ────────────────────────────────────────────────────────────

const SCHEDULED_KEY = "bp_notif_scheduled_date";

export function scheduleDailyNotifications(ctx: NotificationContext, opts: {
  morningTime: string;   // "7:00 am"
  eveningTime: string;   // "7:00 pm"
  reg?: ServiceWorkerRegistration | null;
}) {
  if (!isNotificationsGranted()) return;

  const today = new Date().toDateString();
  const lastScheduled = localStorage.getItem(SCHEDULED_KEY);
  if (lastScheduled === today) return; // Already scheduled for today
  localStorage.setItem(SCHEDULED_KEY, today);

  const { morningTime, eveningTime, reg } = opts;

  const schedule = (title: string, body: string, delayMs: number, tag: string) => {
    if (delayMs < 0) return;

    // Prefer service worker for background delivery
    if (reg?.active) {
      reg.active.postMessage({ type: "SCHEDULE_NOTIFICATION", title, body, delayMs, tag });
    }

    // setTimeout fallback — fires if tab stays open
    setTimeout(() => {
      if (!isNotificationsGranted()) return;
      new Notification(title, { body, icon: "/icon-192.png", tag });
    }, delayMs);
  };

  const morningDelay = msUntil(morningTime);
  const eveningDelay = msUntil(eveningTime);

  // Morning notification
  schedule(morningTitle(ctx), morningBody(ctx), morningDelay, "bp-morning");

  // Evening notification
  schedule(eveningTitle(ctx), eveningBody(ctx), eveningDelay, "bp-evening");

  // Midday nudge if nothing is completed by noon (only if morning hasn't passed yet)
  const noonDelay = msUntil("12:00 pm");
  if (ctx.completedCount === 0 && ctx.totalActions > 0) {
    schedule(`Still time today`, middayBody(ctx), noonDelay, "bp-midday");
  }
}
