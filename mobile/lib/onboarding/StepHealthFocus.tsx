import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import StepBase from './StepBase';
import type { StepProps } from './types';

const FOCUSES = [
  {
    id: 'longevity',
    label: 'Longevity & Healthspan',
    subtitle: 'Slow aging, extend healthy years',
    emoji: '🌿',
  },
  {
    id: 'energy',
    label: 'Energy & Performance',
    subtitle: 'More fuel, sharper focus, better output',
    emoji: '⚡',
  },
  {
    id: 'weight_loss',
    label: 'Weight & Metabolic Health',
    subtitle: 'Fat loss, glucose control, body composition',
    emoji: '⚖️',
  },
  {
    id: 'hormone_balance',
    label: 'Hormone Balance',
    subtitle: 'Testosterone, cortisol, thyroid, vitality',
    emoji: '🔬',
  },
  {
    id: 'heart_health',
    label: 'Heart & Cardiovascular',
    subtitle: 'Lipids, blood pressure, cardio fitness',
    emoji: '❤️',
  },
  {
    id: 'muscle_gain',
    label: 'Strength & Muscle',
    subtitle: 'Build muscle, optimize recovery',
    emoji: '💪',
  },
];

export default function StepHealthFocus({ step, totalSteps, profile, update, next, back }: StepProps) {
  const [primary, setPrimary] = useState<string>(profile.primaryFocus ?? '');
  const secondary: string[] = profile.goals ?? [];

  function toggleSecondary(id: string) {
    if (id === primary) return;
    const next = secondary.includes(id)
      ? secondary.filter(g => g !== id)
      : [...secondary, id];
    update({ goals: next });
  }

  function handleNext() {
    update({ primaryFocus: primary, goals: [primary, ...secondary.filter(g => g !== primary)] });
    next();
  }

  return (
    <StepBase
      step={step}
      totalSteps={totalSteps}
      title="What's your primary focus?"
      subtitle="We'll build your daily protocol around this. You can track everything, but this gets prioritized first."
      onBack={back}
      ctaLabel="Continue"
      onCta={handleNext}
      ctaDisabled={!primary}
    >
      <View style={s.list}>
        {FOCUSES.map(f => {
          const isPrimary = primary === f.id;
          const isSecondary = secondary.includes(f.id) && !isPrimary;
          return (
            <TouchableOpacity
              key={f.id}
              style={[s.card, isPrimary && s.cardPrimary, isSecondary && s.cardSecondary]}
              onPress={() => {
                if (isPrimary) return;
                setPrimary(f.id);
              }}
              onLongPress={() => toggleSecondary(f.id)}
              activeOpacity={0.75}
            >
              <Text style={s.cardEmoji}>{f.emoji}</Text>
              <View style={s.cardText}>
                <Text style={[s.cardLabel, isPrimary && s.cardLabelPrimary]}>{f.label}</Text>
                <Text style={s.cardSub}>{f.subtitle}</Text>
              </View>
              {isPrimary && (
                <View style={s.badge}>
                  <Text style={s.badgeTxt}>Primary</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={s.hint}>Tap to select primary · Long press to add secondary goals</Text>
    </StepBase>
  );
}

const PURPLE = '#9333ea';

const s = StyleSheet.create({
  list: { gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  cardPrimary: {
    borderColor: PURPLE,
    backgroundColor: '#faf5ff',
  },
  cardSecondary: {
    borderColor: '#d8b4fe',
    backgroundColor: '#fdf4ff',
  },
  cardEmoji: { fontSize: 24 },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  cardLabelPrimary: { color: PURPLE },
  cardSub: { fontSize: 13, color: '#6b7280' },
  badge: {
    backgroundColor: PURPLE,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeTxt: { fontSize: 11, fontWeight: '700', color: '#fff' },
  hint: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 8 },
});
