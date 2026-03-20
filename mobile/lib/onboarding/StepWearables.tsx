import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import StepBase from './StepBase';
import type { StepProps } from './types';

type WearableSource = 'Apple Health' | 'Whoop' | 'Oura' | 'Garmin' | 'none';

const DEVICES: { value: WearableSource; label: string; emoji: string; desc: string }[] = [
  {
    value: 'Apple Health',
    label: 'Apple Health',
    emoji: '🍎',
    desc: 'iPhone steps, heart rate, sleep',
  },
  {
    value: 'Whoop',
    label: 'WHOOP',
    emoji: '🔴',
    desc: 'Strain, recovery, HRV',
  },
  {
    value: 'Oura',
    label: 'Oura Ring',
    emoji: '💍',
    desc: 'Sleep, readiness, HRV',
  },
  {
    value: 'Garmin',
    label: 'Garmin',
    emoji: '⌚',
    desc: 'Activity, VO2 max, sleep',
  },
  {
    value: 'none',
    label: 'I don\'t use a wearable',
    emoji: '⊘',
    desc: 'You can connect one later',
  },
];

export default function StepWearables({ step, totalSteps, profile, update, next, back }: StepProps) {
  const [selected, setSelected] = useState<WearableSource | ''>(
    profile.wearableSource ?? ''
  );

  function handleNext() {
    update({ wearableSource: selected || 'none' });
    next();
  }

  return (
    <StepBase
      step={step}
      totalSteps={totalSteps}
      title="Connect a wearable"
      subtitle="Wearable data lets your AI coach track sleep, HRV, and daily activity in context."
      onBack={back}
      ctaLabel="Continue"
      onCta={handleNext}
      ctaDisabled={!selected}
      skipLabel="Skip for now"
      onSkip={() => { update({ wearableSource: 'none' }); next(); }}
    >
      {DEVICES.map(d => {
        const active = selected === d.value;
        return (
          <TouchableOpacity
            key={d.value}
            style={[s.card, active && s.cardActive]}
            onPress={() => setSelected(d.value)}
            activeOpacity={0.8}
          >
            <View style={s.iconBox}>
              <Text style={s.icon}>{d.emoji}</Text>
            </View>
            <View style={s.cardBody}>
              <Text style={[s.cardTitle, active && s.cardTitleActive]}>{d.label}</Text>
              <Text style={s.cardDesc}>{d.desc}</Text>
            </View>
            <View style={[s.radio, active && s.radioActive]}>
              {active && <View style={s.radioDot} />}
            </View>
          </TouchableOpacity>
        );
      })}

      <Text style={s.note}>
        Connections are read-only and can be removed at any time.
      </Text>
    </StepBase>
  );
}

const PURPLE = '#9333ea';

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    marginBottom: 10,
    gap: 12,
  },
  cardActive: {
    borderColor: PURPLE,
    backgroundColor: '#faf5ff',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 20 },
  cardBody: { flex: 1 },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  cardTitleActive: { color: PURPLE },
  cardDesc: {
    fontSize: 12,
    color: '#6b7280',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: PURPLE },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PURPLE,
  },
  note: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
});
