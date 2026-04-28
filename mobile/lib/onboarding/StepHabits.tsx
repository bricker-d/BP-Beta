import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import StepBase from './StepBase';
import type { StepProps } from './types';

const SLEEP_OPTIONS = ['< 5 hrs', '5–6 hrs', '6–7 hrs', '7–8 hrs', '8+ hrs'];
const EXERCISE_OPTIONS = ['0 days', '1–2 days', '3–4 days', '5+ days'];
const DIET_OPTIONS = [
  { id: 'standard', label: 'Standard / mixed', emoji: '🍽️' },
  { id: 'low_carb', label: 'Low carb / keto', emoji: '🥩' },
  { id: 'mediterranean', label: 'Mediterranean', emoji: '🫒' },
  { id: 'plant_based', label: 'Plant-based', emoji: '🥦' },
  { id: 'intermittent_fasting', label: 'Intermittent fasting', emoji: '⏱️' },
];
const STRESS_OPTIONS = ['Low', 'Moderate', 'High', 'Very high'];
const ALCOHOL_OPTIONS = ['None', '1–3/week', '4–7/week', '8+/week'];

export default function StepHabits({ step, totalSteps, profile, update, next, back }: StepProps) {
  const h = profile.habits ?? {} as NonNullable<typeof profile.habits>;
  const [sleep, setSleep]       = useState(h.sleepHours ?? '');
  const [exercise, setExercise] = useState(h.exerciseDaysPerWeek ?? '');
  const [diet, setDiet]         = useState(h.dietType ?? '');
  const [stress, setStress]     = useState(h.stressLevel ?? '');
  const [alcohol, setAlcohol]   = useState(h.alcoholPerWeek ?? '');

  function handleNext() {
    update({ habits: { sleepHours: sleep, exerciseDaysPerWeek: exercise, dietType: diet, stressLevel: stress, alcoholPerWeek: alcohol } });
    next();
  }

  const canContinue = !!(sleep && exercise);

  return (
    <StepBase
      step={step}
      totalSteps={totalSteps}
      title="Your current habits"
      subtitle="Your baseline shapes which biomarker actions will move the needle fastest."
      onBack={back}
      ctaLabel="Continue"
      onCta={handleNext}
      ctaDisabled={!canContinue}
      skipLabel="Skip"
      onSkip={next}
    >
      {/* Sleep */}
      <Text style={s.label}>Typical nightly sleep</Text>
      <View style={s.row}>
        {SLEEP_OPTIONS.map(o => (
          <TouchableOpacity
            key={o}
            style={[s.chip, sleep === o && s.chipActive]}
            onPress={() => setSleep(o)}
          >
            <Text style={[s.chipTxt, sleep === o && s.chipTxtActive]}>{o}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Exercise */}
      <Text style={s.label}>Exercise days per week</Text>
      <View style={s.row}>
        {EXERCISE_OPTIONS.map(o => (
          <TouchableOpacity
            key={o}
            style={[s.chip, exercise === o && s.chipActive]}
            onPress={() => setExercise(o)}
          >
            <Text style={[s.chipTxt, exercise === o && s.chipTxtActive]}>{o}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Diet */}
      <Text style={s.label}>Diet pattern (optional)</Text>
      <View style={s.row}>
        {DIET_OPTIONS.map(o => (
          <TouchableOpacity
            key={o.id}
            style={[s.chip, diet === o.id && s.chipActive]}
            onPress={() => setDiet(o.id)}
          >
            <Text style={s.chipEmoji}>{o.emoji}</Text>
            <Text style={[s.chipTxt, diet === o.id && s.chipTxtActive]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stress */}
      <Text style={s.label}>Typical stress level (optional)</Text>
      <View style={s.row}>
        {STRESS_OPTIONS.map(o => (
          <TouchableOpacity
            key={o}
            style={[s.chip, stress === o && s.chipActive]}
            onPress={() => setStress(o)}
          >
            <Text style={[s.chipTxt, stress === o && s.chipTxtActive]}>{o}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Alcohol */}
      <Text style={s.label}>Alcohol (optional)</Text>
      <View style={s.row}>
        {ALCOHOL_OPTIONS.map(o => (
          <TouchableOpacity
            key={o}
            style={[s.chip, alcohol === o && s.chipActive]}
            onPress={() => setAlcohol(o)}
          >
            <Text style={[s.chipTxt, alcohol === o && s.chipTxtActive]}>{o}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </StepBase>
  );
}

const PURPLE = '#9333ea';

const s = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
    marginTop: 4,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  chipActive: { borderColor: PURPLE, backgroundColor: '#faf5ff' },
  chipTxt: { fontSize: 13, fontWeight: '500', color: '#374151' },
  chipTxtActive: { color: PURPLE, fontWeight: '600' },
  chipEmoji: { fontSize: 14 },
});
