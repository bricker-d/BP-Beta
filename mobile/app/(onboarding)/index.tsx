import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useHealthStore } from '../../lib/store';
import type { IntakeProfile } from '../../lib/types';

import StepGoals        from '../../lib/onboarding/StepGoals';
import StepHealthFocus  from '../../lib/onboarding/StepHealthFocus';
import StepBiometrics   from '../../lib/onboarding/StepBiometrics';
import StepHabits       from '../../lib/onboarding/StepHabits';
import StepSymptoms     from '../../lib/onboarding/StepSymptoms';
import StepLabs         from '../../lib/onboarding/StepLabs';
import StepWearables    from '../../lib/onboarding/StepWearables';
import StepSummary      from '../../lib/onboarding/StepSummary';

// Step order:
// 0: Goals + name
// 1: Primary health focus
// 2: Biometrics (age, sex, height, weight)
// 3: Current habits (sleep, exercise, diet, stress, alcohol)
// 4: Symptoms
// 5: Lab upload
// 6: Wearable connect
// 7: AI summary

const TOTAL_STEPS = 8;

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
      {step === 0 && <StepGoals       {...stepProps} />}
      {step === 1 && <StepHealthFocus {...stepProps} />}
      {step === 2 && <StepBiometrics  {...stepProps} />}
      {step === 3 && <StepHabits      {...stepProps} />}
      {step === 4 && <StepSymptoms    {...stepProps} />}
      {step === 5 && <StepLabs        {...stepProps} />}
      {step === 6 && <StepWearables   {...stepProps} />}
      {step === 7 && <StepSummary     {...stepProps} onFinish={finish} />}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});
