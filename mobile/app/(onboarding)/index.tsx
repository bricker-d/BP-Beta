import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useHealthStore } from '../../lib/store';
import type { IntakeProfile } from '../../lib/types';

import StepGoals from '../../lib/onboarding/StepGoals';
import StepBiometrics from '../../lib/onboarding/StepBiometrics';
import StepSymptoms from '../../lib/onboarding/StepSymptoms';
import StepLabs from '../../lib/onboarding/StepLabs';
import StepWearables from '../../lib/onboarding/StepWearables';
import StepSummary from '../../lib/onboarding/StepSummary';

const TOTAL_STEPS = 6;

export default function OnboardingScreen() {
  const router = useRouter();
    const { completeOnboarding } = useHealthStore();

      const [step, setStep] = useState(0);
        const [profile, setProfile] = useState<Partial<IntakeProfile>>({});

          const update = (data: Partial<IntakeProfile>) => {
              setProfile((prev) => ({ ...prev, ...data }));
                };

                  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
                    const back = () => setStep((s) => Math.max(s - 1, 0));

                      const finish = (summaryMsg: string) => {
                          completeOnboarding(profile as IntakeProfile, summaryMsg);
                              router.replace('/(tabs)');
                                };

                                  const stepProps = { profile, update, next, back, step, totalSteps: TOTAL_STEPS };

                                    return (
                                        <View style={s.container}>
                                              {step === 0 && <StepGoals {...stepProps} />}
                                                    {step === 1 && <StepBiometrics {...stepProps} />}
                                                          {step === 2 && <StepSymptoms {...stepProps} />}
                                                                {step === 3 && <StepLabs {...stepProps} />}
                                                                      {step === 4 && <StepWearables {...stepProps} />}
                                                                            {step === 5 && <StepSummary {...stepProps} onFinish={finish} />}
                                                                                </View>
                                                                                  );
                                                                                  }

                                                                                  const s = StyleSheet.create({
                                                                                    container: { flex: 1, backgroundColor: '#fff' },
                                                                                    });