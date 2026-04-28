import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { useHealthStore } from '../lib/store';
import {
  registerForPushNotifications,
  scheduleDailyNotifications,
} from '../lib/notifications';

function OnboardingGuard() {
  const router   = useRouter();
  const segments = useSegments();
  const hasCompletedOnboarding = useHealthStore((s) => s.hasCompletedOnboarding);
  const syncWearable            = useHealthStore((s) => s.syncWearable);
  const markWearableConnected   = useHealthStore((s) => s.markWearableConnected);
  const notifSetup = useRef(false);

  // Route guard
  useEffect(() => {
    const inOnboarding = segments[0] === '(onboarding)';
    const inTabs       = segments[0] === '(tabs)';
    if (!hasCompletedOnboarding && !inOnboarding) {
      router.replace('/(onboarding)');
    } else if (hasCompletedOnboarding && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [hasCompletedOnboarding, segments]);

  // Setup notifications once after onboarding
  useEffect(() => {
    if (!hasCompletedOnboarding || notifSetup.current) return;
    notifSetup.current = true;
    registerForPushNotifications()
      .then((token) => {
        if (token) scheduleDailyNotifications();
      })
      .catch(() => {});
  }, [hasCompletedOnboarding]);

  // Sync wearable data on app open
  useEffect(() => {
    if (!hasCompletedOnboarding) return;
    syncWearable().catch(() => {});
  }, [hasCompletedOnboarding]);

  // Handle deep link from wearable OAuth callback
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const screen = response.notification.request.content.data?.screen as string;
      if (!screen) return;
      if (screen === 'checkin') router.push('/(tabs)');
      else if (screen === 'actions') router.push('/(tabs)/actions');
      else if (screen === 'coach')   router.push('/(tabs)/coach');
    });
    return () => sub.remove();
  }, []);

  return null;
}

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <OnboardingGuard />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
