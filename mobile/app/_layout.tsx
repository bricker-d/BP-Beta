import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useHealthStore } from '../lib/store';
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';

SplashScreen.preventAutoHideAsync();
import {
  registerForPushNotifications,
  scheduleDailyNotifications,
  sendCompletionCelebration,
} from '../lib/notifications';

function OnboardingGuard() {
  const router   = useRouter();
  const segments = useSegments();
  const hasCompletedOnboarding = useHealthStore((s) => s.hasCompletedOnboarding);
  const syncWearable            = useHealthStore((s) => s.syncWearable);
  const actions                 = useHealthStore((s) => s.actions);
  const intakeProfile           = useHealthStore((s) => s.intakeProfile);
  const streak                  = useHealthStore((s) => s.streak);
  const toggleAction            = useHealthStore((s) => s.toggleAction);
  const notifSetup = useRef(false);

  // Route guard
  useEffect(() => {
    const inOnboarding = segments[0] === '(onboarding)';
    if (!hasCompletedOnboarding && !inOnboarding) {
      router.replace('/(onboarding)');
    } else if (hasCompletedOnboarding && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [hasCompletedOnboarding, segments]);

  // Setup notifications once after onboarding completes
  useEffect(() => {
    if (!hasCompletedOnboarding || notifSetup.current) return;
    notifSetup.current = true;
    registerForPushNotifications()
      .then((token) => {
        if (token) scheduleDailyNotifications(actions, intakeProfile, streak);
      })
      .catch(() => {});
  }, [hasCompletedOnboarding]);

  // Sync wearable on app open
  useEffect(() => {
    if (!hasCompletedOnboarding) return;
    syncWearable().catch(() => {});
  }, [hasCompletedOnboarding]);

  // Handle notification taps and action buttons
  useEffect(() => {
    const { addNotificationResponseReceivedListener } = require('expo-notifications');
    const sub = addNotificationResponseReceivedListener((response: any) => {
      const actionId   = response.actionIdentifier;
      const data       = response.notification.request.content.data ?? {};
      const screen     = data.screen as string;
      const targetId   = data.actionId as string;

      // "Done" button — mark complete without opening app
      if (actionId === 'DONE' && targetId) {
        toggleAction(targetId);
        const allDone = actions.every(a => a.id === targetId ? true : a.completed);
        if (allDone) sendCompletionCelebration().catch(() => {});
        return;
      }

      // "Remind me in 1hr" button
      if (actionId === 'REMIND_1HR') {
        const Notifications = require('expo-notifications');
        Notifications.scheduleNotificationAsync({
          identifier: `remind-later-${Date.now()}`,
          content: response.notification.request.content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 3600,
          },
        }).catch(() => {});
        return;
      }

      // Default tap — navigate to screen
      if (screen === 'actions') router.push('/(tabs)/actions');
      else if (screen === 'coach') router.push('/(tabs)/coach');
      else if (screen === 'checkin') router.push('/(tabs)');
    });
    return () => sub.remove();
  }, [actions, toggleAction]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <>
      <StatusBar style="dark" />
      <OnboardingGuard />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
