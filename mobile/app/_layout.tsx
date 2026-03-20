import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useHealthStore } from '../lib/store';

function OnboardingGuard() {
  const router = useRouter();
    const segments = useSegments();
      const hasCompletedOnboarding = useHealthStore((s) => s.hasCompletedOnboarding);

        useEffect(() => {
            const inOnboarding = segments[0] === '(onboarding)';
                const inTabs = segments[0] === '(tabs)';

                    if (!hasCompletedOnboarding && !inOnboarding) {
                          // First-time user: send to onboarding
                                router.replace('/(onboarding)');
                                    } else if (hasCompletedOnboarding && inOnboarding) {
                                          // Already onboarded: send to dashboard
                                                router.replace('/(tabs)');
                                                    }
                                                      }, [hasCompletedOnboarding, segments]);

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