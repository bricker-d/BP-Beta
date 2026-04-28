import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// ── Notification handler (foreground) ────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

// ── Request permissions ───────────────────────────────────────────────────────
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[notifications] Push notifications only work on physical devices');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[notifications] Permission not granted');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('bioprecision', {
      name: 'BioPrecision',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

// ── Schedule daily notifications ──────────────────────────────────────────────

export async function scheduleDailyNotifications(): Promise<void> {
  // Cancel existing scheduled notifications before rescheduling
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Morning check-in — 8:00 AM daily
  await Notifications.scheduleNotificationAsync({
    identifier: 'morning-checkin',
    content: {
      title: "Morning check-in 🌅",
      body: "How did yesterday's actions go? Log your progress to track your biomarker trends.",
      data: { screen: 'checkin' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 8,
      minute: 0,
    },
  });

  // Evening action nudge — 7:00 PM daily
  await Notifications.scheduleNotificationAsync({
    identifier: 'evening-nudge',
    content: {
      title: "Action reminder 💊",
      body: "Don't forget your evening actions — supplements and sleep prep.",
      data: { screen: 'actions' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 19,
      minute: 0,
    },
  });

  // Sunday weekly summary — 9:00 AM
  await Notifications.scheduleNotificationAsync({
    identifier: 'weekly-summary',
    content: {
      title: "Weekly progress summary 📊",
      body: "Your AI coach has reviewed your week. See what moved and what to focus on next.",
      data: { screen: 'coach' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // Sunday = 1 in Expo
      hour: 9,
      minute: 0,
    },
  });

  console.log('[notifications] Scheduled: morning check-in, evening nudge, weekly summary');
}

// ── Cancel all notifications ──────────────────────────────────────────────────
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ── Handle notification tap ───────────────────────────────────────────────────
// Call this in your root layout to handle taps that open the app
export function useNotificationNavigation(
  onNavigate: (screen: string) => void
) {
  Notifications.useLastNotificationResponse((response) => {
    const screen = response?.notification?.request?.content?.data?.screen as string;
    if (screen) onNavigate(screen);
  });
}
