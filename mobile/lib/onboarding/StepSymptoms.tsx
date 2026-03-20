import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import StepBase from './StepBase';
import type { StepProps } from './types';

const SYMPTOMS = [
  { id: 'fatigue',       label: 'Fatigue / low energy',    emoji: '😴' },
  { id: 'brainfog',      label: 'Brain fog',               emoji: '🌫️' },
  { id: 'poor_sleep',    label: 'Poor sleep',              emoji: '🌙' },
  { id: 'mood',          label: 'Mood swings',             emoji: '🎭' },
  { id: 'weight_gain',   label: 'Unexplained weight gain', emoji: '⚖️' },
  { id: 'low_libido',    label: 'Low libido',              emoji: '❄️' },
  { id: 'joint_pain',    label: 'Joint / muscle pain',     emoji: '🦴' },
  { id: 'digestion',     label: 'Digestive issues',        emoji: '🫁' },
  { id: 'hair_skin',     label: 'Hair or skin changes',    emoji: '💇' },
  { id: 'anxiety',       label: 'Anxiety / stress',        emoji: '😰' },
];

export default function StepSymptoms({ step, totalSteps, profile, update, next, back }: StepProps) {
  const selected: string[] = profile.symptoms ?? [];
  const [other, setOther] = useState(profile.symptomsOther ?? '');

  function toggle(id: string) {
    const next = selected.includes(id)
      ? selected.filter(s => s !== id)
      : [...selected, id];
    update({ symptoms: next });
  }

  function handleNext() {
    update({ symptomsOther: other.trim() || undefined });
    next();
  }

  return (
    <StepBase
      step={step}
      totalSteps={totalSteps}
      title="Any symptoms?"
      subtitle="Select anything you've been experiencing. This helps your AI coach prioritise what matters."
      onBack={back}
      ctaLabel="Continue"
      onCta={handleNext}
      skipLabel="None / skip"
      onSkip={next}
    >
      <View style={s.grid}>
        {SYMPTOMS.map(sym => {
          const active = selected.includes(sym.id);
          return (
            <TouchableOpacity
              key={sym.id}
              style={[s.chip, active && s.chipActive]}
              onPress={() => toggle(sym.id)}
              activeOpacity={0.75}
            >
              <Text style={s.chipEmoji}>{sym.emoji}</Text>
              <Text style={[s.chipLabel, active && s.chipLabelActive]}>{sym.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={s.otherGroup}>
        <Text style={s.otherLabel}>Anything else?</Text>
        <TextInput
          style={s.otherInput}
          placeholder="Describe other symptoms (optional)"
          placeholderTextColor="#9ca3af"
          value={other}
          onChangeText={setOther}
          multiline
          numberOfLines={2}
          textAlignVertical="top"
        />
      </View>
    </StepBase>
  );
}

const PURPLE = '#9333ea';

const s = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginBottom: 24,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  chipActive: {
    borderColor: PURPLE,
    backgroundColor: '#faf5ff',
  },
  chipEmoji: { fontSize: 15 },
  chipLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  chipLabelActive: {
    color: PURPLE,
    fontWeight: '600',
  },
  otherGroup: {
    gap: 6,
  },
  otherLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  otherInput: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fafafa',
    minHeight: 64,
  },
});
