import React from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import type { HealthAction, IntakeProfile } from './types';

// ── Foreground handler ────────────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Register action button categories ────────────────────────────────────────
export async function registerNotificationCategories() {
  await Notifications.setNotificationCategoryAsync('action-reminder', [
    { identifier: 'DONE',       buttonTitle: '✓ Done',           options: { isDestructive: false } },
    { identifier: 'REMIND_1HR', buttonTitle: 'Remind me in 1hr', options: { isDestructive: false } },
  ]);
  await Notifications.setNotificationCategoryAsync('streak-protection', [
    { identifier: 'OPEN_ACTIONS', buttonTitle: 'View my actions', options: { isDestructive: false } },
  ]);
  await Notifications.setNotificationCategoryAsync('coach-prompt', [
    { identifier: 'OPEN_COACH', buttonTitle: 'Ask my coach', options: { isDestructive: false } },
  ]);
}

// ── Permissions ───────────────────────────────────────────────────────────────
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('bioprecision', {
      name: 'BioPrecision',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  await registerNotificationCategories();

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

// ── Coach prompt pool ─────────────────────────────────────────────────────────
const COACH_PROMPTS: string[] = [
  "How's your energy been this week? Your coach can connect it to your labs.",
  "Fatigue often has a root cause in your bloodwork. Ask your coach what yours might be.",
  "Your coach knows your numbers. Ask: 'Why am I still tired?'",
  "Sleep quality affects almost every biomarker. How have you been sleeping?",
  "Ask your coach: 'What can I do tonight to sleep better?'",
  "Consistency in your daily actions compounds over weeks. Ask your coach what's likely changing.",
  "Your coach can tell you which of your actions is having the most impact. Ask.",
  "Inflammation is silent. Your coach can explain what your markers mean in plain terms.",
  "You've been showing up. Your coach can tell you what that looks like in your biology.",
  "What's one thing about your health you've been curious about? Ask your coach now.",
  "Your protocol is built on your labs. Ask your coach why each action was chosen for you.",
  "Quick question for your coach: 'Am I on track?'",
  "Your coach is ready. What's one thing you want to understand better about your health?",
];

function pickCoachPrompt(seed: number): string {
  return COACH_PROMPTS[seed % COACH_PROMPTS.length];
}

// ── Schedule all notifications ────────────────────────────────────────────────
export async function scheduleDailyNotifications(
  actions: HealthAction[],
  profile: IntakeProfile | null,
  streakCount: number = 0,
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const name = profile?.name?.split(' ')[0] ?? '';

  const morning = actions.find(a => a.timeOfDay === 'morning') ?? actions[0];
  const midday  = actions.find(a => a.timeOfDay === 'midday')  ?? actions[1];
  const evening = actions.find(a => a.timeOfDay === 'evening') ?? actions[actions.length - 1];

  // ── Morning 8:00am ──────────────────────────────────────────────────────────
  if (morning) {
    await Notifications.scheduleNotificationAsync({
      identifier: 'morning-action',
      content: {
        title: `Good morning${name ? ', ' + name : ''} \u{1F305}`,
        body: `First up: ${morning.title}`,
        data: { screen: 'actions', actionId: morning.id },
        categoryIdentifier: 'action-reminder',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 8, minute: 0 },
    });
  }

  // ── Midday 12:30pm ──────────────────────────────────────────────────────────
  if (midday && midday.id !== morning?.id) {
    await Notifications.scheduleNotificationAsync({
      identifier: 'midday-action',
      content: {
        title: 'Midday check \u2600\uFE0F',
        body: midday.title,
        data: { screen: 'actions', actionId: midday.id },
        categoryIdentifier: 'action-reminder',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 12, minute: 30 },
    });
  }

  // ── Evening 7:30pm ──────────────────────────────────────────────────────────
  if (evening && evening.id !== morning?.id && evening.id !== midday?.id) {
    await Notifications.scheduleNotificationAsync({
      identifier: 'evening-action',
      content: {
        title: 'Evening routine \uD83C\uDF19',
        body: evening.title,
        data: { screen: 'actions', actionId: evening.id },
        categoryIdentifier: 'action-reminder',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 19, minute: 30 },
    });
  }

  // ── Streak protection 8:45pm ────────────────────────────────────────────────
  if (streakCount > 0) {
    await Notifications.scheduleNotificationAsync({
      identifier: 'streak-protection',
      content: {
        title: `${streakCount}-day streak on the line \uD83D\uDD25`,
        body: 'A few minutes now keeps your momentum going.',
        data: { screen: 'actions' },
        categoryIdentifier: 'streak-protection',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 20, minute: 45 },
    });
  }

  // ── Coach prompts Mon/Wed/Fri at varied times ───────────────────────────────
  const coachSchedule = [
    { weekday: 2, hour: 10 }, // Monday 10am
    { weekday: 4, hour: 14 }, // Wednesday 2pm
    { weekday: 6, hour: 16 }, // Friday 4pm
  ];
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );

  for (let i = 0; i < coachSchedule.length; i++) {
    const { weekday, hour } = coachSchedule[i];
    await Notifications.scheduleNotificationAsync({
      identifier: `coach-prompt-${weekday}`,
      content: {
        title: 'Your health coach \uD83E\uDDE0',
        body: pickCoachPrompt(dayOfYear + i),
        data: { screen: 'coach' },
        categoryIdentifier: 'coach-prompt',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday, hour, minute: 0 },
    });
  }

  // ── Weekly summary Sunday 9am ───────────────────────────────────────────────
  await Notifications.scheduleNotificationAsync({
    identifier: 'weekly-summary',
    content: {
      title: 'Your week in review \uD83D\uDCCA',
      body: "Your coach has reviewed your progress. See what's moving.",
      data: { screen: 'coach' },
      categoryIdentifier: 'coach-prompt',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour: 9, minute: 0 },
  });

  console.log('[notifications] Scheduled: morning, midday, evening, streak, coach x3, weekly');
}

// ── Immediate celebration when all actions done ───────────────────────────────
export async function sendCompletionCelebration() {
  await Notifications.scheduleNotificationAsync({
    identifier: 'all-done',
    content: {
      title: 'Protocol complete \u2713',
      body: "That's all for today. Consistency is the whole game.",
      data: { screen: 'actions' },
    },
    trigger: null,
  });
}

// ── Cancel all ────────────────────────────────────────────────────────────────
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ── Handle notification tap and action buttons ────────────────────────────────
export function useNotificationNavigation(
  onNavigate: (screen: string, params?: Record<string, string>) => void,
  onActionComplete?: (actionId: string) => void,
) {
  const response = Notifications.useLastNotificationResponse();

  React.useEffect(() => {
    if (!response) return;
    const { actionIdentifier, notification } = response;
    const data = notification.request.content.data as Record<string, string>;

    if (actionIdentifier === 'DONE' && data.actionId && onActionComplete) {
      onActionComplete(data.actionId);
      return;
    }

    if (actionIdentifier === 'REMIND_1HR') {
      Notifications.scheduleNotificationAsync({
        identifier: `remind-later-${Date.now()}`,
        content: notification.request.content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 3600,
        },
      });
      return;
    }

    if (data.screen) onNavigate(data.screen, data);
  }, [response]);
}
