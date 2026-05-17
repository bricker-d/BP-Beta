import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useHealthStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import type { IntakeProfile } from '../../lib/types';

import StepAuth        from '../../lib/onboarding/StepAuth';
import StepGoals       from '../../lib/onboarding/StepGoals';
import StepHealthFocus from '../../lib/onboarding/StepHealthFocus';
import StepBiometrics  from '../../lib/onboarding/StepBiometrics';
import StepHabits      from '../../lib/onboarding/StepHabits';
import StepSymptoms    from '../../lib/onboarding/StepSymptoms';
import StepLabs        from '../../lib/onboarding/StepLabs';
import StepWearables   from '../../lib/onboarding/StepWearables';
import StepSummary     from '../../lib/onboarding/StepSummary';

// Step 0: Auth (email + password)
// Step 1: Goals + name
// Step 2: Primary health focus
// Step 3: Biometrics
// Step 4: Habits
// Step 5: Symptoms
// Step 6: Lab upload
// Step 7: Wearable connect
// Step 8: AI summary

const TOTAL_STEPS = 9;
const FIRST_PROFILE_STEP = 1; // step to jump to when already authenticated

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding } = useHealthStore();

  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Partial<IntakeProfile>>({});

  // Skip auth step if user is already signed in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setStep(FIRST_PROFILE_STEP);
    });
  }, []);

  const update = (data: Partial<IntakeProfile>) =>
    setProfile(prev => ({ ...prev, ...data }));

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  async function finish(summaryMsg: string) {
    // Write profile + onboarding_complete to Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from('profiles').upsert({
        id:                  session.user.id,
        name:                profile.name ?? null,
        primary_focus:       profile.primaryFocus ?? null,
        goals:               profile.goals ?? [],
        age:                 profile.age ?? null,
        biological_sex:      profile.biologicalSex ?? null,
        height_ft:           profile.heightFt ?? null,
        height_in:           profile.heightIn ?? null,
        weight_lbs:          profile.weightLbs ?? null,
        symptoms:            profile.symptoms ?? [],
        habits:              profile.habits ?? null,
        onboarding_complete: true,
        updated_at:          new Date().toISOString(),
      });

      // Auto-assign the default BioPrecision Foundation Protocol if user has no active protocol
      const DEFAULT_PROTOCOL_ID = 'a0000000-0000-0000-0000-000000000001';
      const { data: existing } = await supabase
        .from('user_protocols')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!existing) {
        await supabase.from('user_protocols').insert({
          user_id:     session.user.id,
          protocol_id: DEFAULT_PROTOCOL_ID,
          status:      'active',
          current_day: 1,
        });
      }
    }

    completeOnboarding(profile as IntakeProfile, summaryMsg);
    router.replace('/(tabs)');
  }

  const stepProps = { profile, update, next, back, step: step - 1, totalSteps: TOTAL_STEPS - 1 };

  return (
    <View style={s.container}>
      {step === 0 && <StepAuth onAuthenticated={() => setStep(FIRST_PROFILE_STEP)} />}
      {step === 1 && <StepGoals       {...stepProps} />}
      {step === 2 && <StepHealthFocus {...stepProps} />}
      {step === 3 && <StepBiometrics  {...stepProps} />}
      {step === 4 && <StepHabits      {...stepProps} />}
      {step === 5 && <StepSymptoms    {...stepProps} />}
      {step === 6 && <StepLabs        {...stepProps} />}
      {step === 7 && <StepWearables   {...stepProps} />}
      {step === 8 && <StepSummary     {...stepProps} onFinish={finish} />}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});
