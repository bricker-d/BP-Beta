import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useHealthStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { ErrorBoundary } from '../lib/ErrorBoundary';
import { WhiteLabelProvider } from '../lib/WhiteLabelContext';
import { configureRevenueCat } from '../lib/paywall';
import { identify } from '../lib/analytics';
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
  const fetchProtocol           = useHealthStore((s) => s.fetchProtocol);
  const actions                 = useHealthStore((s) => s.actions);
  const intakeProfile           = useHealthStore((s) => s.intakeProfile);
  const streak                  = useHealthStore((s) => s.streak);
  const toggleAction            = useHealthStore((s) => s.toggleAction);
  const notifSetup = useRef(false);

  // Route guard — checks Supabase session as source of truth
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // No session — send to onboarding (which starts at auth step)
        if (segments[0] !== '(onboarding)') router.replace('/(onboarding)');
        return;
      }

      // Session exists — check profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_complete')
        .eq('id', session.user.id)
        .single();

      const complete = profile?.onboarding_complete ?? false;

      if (complete && segments[0] === '(onboarding)') {
        router.replace('/(tabs)');
      } else if (!complete && segments[0] !== '(onboarding)') {
        router.replace('/(onboarding)');
      }
    }

    checkAuth();
  }, [segments]);

  // Listen for auth state changes (logout, new login)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/(onboarding)');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

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

  // Sync wearable + protocol on app open
  useEffect(() => {
    if (!hasCompletedOnboarding) return;
    syncWearable().catch(() => {});
    fetchProtocol().catch(() => {});
  }, [hasCompletedOnboarding]);

  // Init RevenueCat + analytics identity on onboarding complete
  useEffect(() => {
    if (!hasCompletedOnboarding) return;
    const { deviceId, intakeProfile } = useHealthStore.getState();
    configureRevenueCat(deviceId ?? undefined);
    if (deviceId) {
      identify(deviceId, {
        name: intakeProfile?.name,
        goals: intakeProfile?.goals,
        hasLabs: !!useHealthStore.getState().labPanel,
      });
    }
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
    <ErrorBoundary>
      <WhiteLabelProvider>
        <StatusBar style="dark" />
        <OnboardingGuard />
        <Stack screenOptions={{ headerShown: false }} />
      </WhiteLabelProvider>
    </ErrorBoundary>
  );
}
