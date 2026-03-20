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

const GOALS = [
  { id: 'longevity',      label: 'Live longer',          emoji: '🌿' },
  { id: 'energy',         label: 'More energy',          emoji: '⚡' },
  { id: 'weight',         label: 'Lose weight',          emoji: '⚖️' },
  { id: 'muscle',         label: 'Build muscle',         emoji: '💪' },
  { id: 'sleep',          label: 'Better sleep',         emoji: '🌙' },
  { id: 'cognition',      label: 'Sharper focus',        emoji: '🧠' },
  { id: 'hormones',       label: 'Balance hormones',     emoji: '🔬' },
  { id: 'heart',          label: 'Heart health',         emoji: '❤️' },
];

export default function StepGoals({ step, totalSteps, profile, update, next, back }: StepProps) {
  const selected: string[] = profile.goals ?? [];
  const [name, setName] = useState(profile.name ?? '');

  function toggleGoal(id: string) {
    const next = selected.includes(id)
      ? selected.filter(g => g !== id)
      : [...selected, id];
    update({ goals: next });
  }

  function handleNext() {
    update({ name: name.trim() });
    next();
  }

  return (
    <StepBase
      step={step}
      totalSteps={totalSteps}
      title="Welcome to Bioprecision"
      subtitle="Let's personalise your health journey. First, what's your name?"
      onBack={step > 0 ? back : undefined}
      ctaLabel="Continue"
      onCta={handleNext}
      ctaDisabled={!name.trim() || selected.length === 0}
    >
      {/* Name input */}
      <TextInput
        style={s.nameInput}
        placeholder="Your first name"
        placeholderTextColor="#9ca3af"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        returnKeyType="done"
      />

      <Text style={s.sectionLabel}>What are your main goals? (pick all that apply)</Text>

      <View style={s.grid}>
        {GOALS.map(g => {
          const active = selected.includes(g.id);
          return (
            <TouchableOpacity
              key={g.id}
              style={[s.chip, active && s.chipActive]}
              onPress={() => toggleGoal(g.id)}
              activeOpacity={0.75}
            >
              <Text style={s.chipEmoji}>{g.emoji}</Text>
              <Text style={[s.chipLabel, active && s.chipLabelActive]}>{g.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </StepBase>
  );
}

const PURPLE = '#9333ea';

const s = StyleSheet.create({
  nameInput: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fafafa',
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  chipActive: {
    borderColor: PURPLE,
    backgroundColor: '#faf5ff',
  },
  chipEmoji: {
    fontSize: 16,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  chipLabelActive: {
    color: PURPLE,
    fontWeight: '600',
  },
});
