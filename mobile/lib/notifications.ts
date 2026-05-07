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

// ── Evidence-backed prompts per biomarker category ───────────────────────────
// Each entry is grounded in the same clinical evidence as the protocol library.
const BIOMARKER_PROMPTS: Record<string, string[]> = {
  testosterone: [
    "Resistance training raises testosterone by 20-25% in most men. How many sessions did you get this week?",
    "Sleep is one of the biggest levers for testosterone — most production happens in deep sleep. How have you been sleeping?",
    "Zinc and magnesium are cofactors for testosterone synthesis. Are you consistent with your evening supplement?",
  ],
  freeTesto: [
    "SHBG binds free testosterone and alcohol raises it. How has your drinking been this week?",
    "Resistance training shifts the testosterone-to-SHBG ratio in your favour. Staying consistent?",
  ],
  glucose: [
    "A 10-minute walk after meals can cut glucose spikes by up to 30%. Have you been doing that after lunch?",
    "Protein before carbs blunts glucose absorption by 30-40%. Are you eating in that order?",
    "Fasting glucose responds to sleep quality — poor sleep raises cortisol, which raises blood sugar. How did you sleep last night?",
  ],
  hba1c: [
    "HbA1c is a 3-month average — small daily habits compound into it. How consistent have you been this week?",
    "Zone 2 cardio (a pace where you can hold a conversation) is one of the best tools for blood sugar. Getting those sessions in?",
  ],
  hscrp: [
    "Inflammation like yours responds fast to diet. How close have you been to the Mediterranean pattern this week?",
    "Sleep under 6 hours raises inflammatory markers by 25%. What's your sleep looking like?",
    "Omega-3s reduce CRP measurably in 6-8 weeks. Taking yours consistently?",
  ],
  vitaminD: [
    "Vitamin D levels respond to consistent daily supplementation over 8-12 weeks. Are you taking yours every day?",
    "Morning sunlight is the most bioavailable form of vitamin D. Have you been getting outside in the morning?",
    "Vitamin D affects mood, immunity, and testosterone. Consistency now shows up in your next panel.",
  ],
  ldl: [
    "Soluble fiber from oats or psyllium binds LDL-raising bile acids. Are you getting fiber in most meals?",
    "Zone 2 cardio shifts your cholesterol profile measurably in 8 weeks. How's your activity level?",
  ],
  triglycerides: [
    "Triglycerides are the fastest-moving marker — they respond to diet within days. How's your sugar and alcohol intake this week?",
    "Omega-3s reduce triglycerides by 20-50% — one of the strongest supplement effects in the literature. Consistent?",
  ],
  ferritin: [
    "Iron-rich foods with vitamin C improve absorption by 3x. Are you pairing them at meals?",
    "Low ferritin is one of the most common hidden causes of fatigue. How's your energy been this week?",
  ],
  homocysteine: [
    "Homocysteine comes down with consistent B12, B6, and folate. Are you taking your supplements daily?",
    "High homocysteine is linked to cardiovascular and cognitive risk — the good news is it's highly responsive to nutrition.",
  ],
  magnesium: [
    "Magnesium before bed improves sleep quality and insulin sensitivity. Have you been consistent with your evening routine?",
    "Most people are magnesium-deficient. It affects sleep, muscle recovery, and blood sugar — all at once.",
  ],
  cortisol: [
    "Cortisol is the master stress hormone — it suppresses testosterone, raises glucose, and disrupts sleep. How's your stress this week?",
    "10 minutes of breathwork daily measurably lowers cortisol over 4 weeks. Have you been doing yours?",
  ],
  tsh: [
    "Thyroid function affects every cell in the body — energy, weight, mood. How's your energy been this week?",
    "Selenium and iodine are key thyroid cofactors. Are you eating varied whole foods?",
  ],
  apoB: [
    "ApoB is the best predictor of cardiovascular risk. It responds to diet, exercise, and omega-3s over 8-12 weeks.",
    "Reducing refined carbs and saturated fat lowers ApoB measurably. How has your diet been this week?",
  ],
};

// Fallback prompts for biomarkers not in the map
const FALLBACK_PROMPTS: string[] = [
  "Your protocol is built on your specific labs. Ask your coach why each action was chosen for you.",
  "Consistency is the whole variable. Ask your coach what's likely changing after two weeks of your protocol.",
  "Your coach knows your numbers and your goals. What's one thing you want to understand better?",
  "Small daily actions compound into measurable lab changes over 8-12 weeks. How consistent have you been?",
];

function generateCoachPrompts(actions: HealthAction[]): string[] {
  const prompts: string[] = [];

  for (const action of actions) {
    for (const biomarkerId of (action.targetBiomarkers ?? [])) {
      const pool = BIOMARKER_PROMPTS[biomarkerId];
      if (pool) prompts.push(...pool);
    }
  }

  // Deduplicate and pad with fallbacks if needed
  const unique = [...new Set(prompts)];
  while (unique.length < 6) unique.push(...FALLBACK_PROMPTS);
  return unique;
}

function pickCoachPrompt(actions: HealthAction[], seed: number): string {
  const pool = generateCoachPrompts(actions);
  return pool[seed % pool.length];
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
        title: `Good morning${name ? ', ' + name : ''}`,
        body: morning.title,
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
        body: pickCoachPrompt(actions, dayOfYear + i),
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

// ── Schedule 90-day lab upload reminder ──────────────────────────────────────
export async function scheduleLabUploadReminder(labDate: string) {
  await Notifications.cancelScheduledNotificationAsync('lab-upload-reminder').catch(() => {});
  const uploaded = new Date(labDate);
  const reminderDate = new Date(uploaded.getTime() + 90 * 24 * 60 * 60 * 1000);
  if (reminderDate <= new Date()) return; // already past
  await Notifications.scheduleNotificationAsync({
    identifier: 'lab-upload-reminder',
    content: {
      title: 'Time for new labs',
      body: "Your protocol has been running 90 days. Upload your new results to see what moved.",
      data: { screen: 'labs' },
      categoryIdentifier: 'coach-prompt',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderDate },
  });
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
