import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
} from 'react-native';
import StepBase from './StepBase';
import type { StepProps } from './types';

const SEX_OPTIONS = [
  { value: 'Male' as const,                 label: 'Male',                emoji: '♂' },
  { value: 'Female' as const,               label: 'Female',              emoji: '♀' },
  { value: 'Other / prefer not to say' as const, label: 'Other / prefer not to say', emoji: '⊘' },
];

export default function StepBiometrics({ step, totalSteps, profile, update, next, back }: StepProps) {
  const [age, setAge]       = useState(profile.age?.toString() ?? '');
  const [heightFt, setHtFt] = useState(profile.heightFt?.toString() ?? '');
  const [heightIn, setHtIn] = useState(profile.heightIn?.toString() ?? '');
  const [weight, setWeight] = useState(profile.weightLbs?.toString() ?? '');
  const [sex, setSex]       = useState<typeof SEX_OPTIONS[number]['value'] | ''>(
    profile.biologicalSex ?? ''
  );

  const canContinue = !!age && !!sex;

  function handleNext() {
    update({
      age:           age ? parseInt(age) : undefined,
      biologicalSex: sex || undefined,
      heightFt:      heightFt ? parseInt(heightFt) : undefined,
      heightIn:      heightIn ? parseInt(heightIn) : undefined,
      weightLbs:     weight ? parseFloat(weight) : undefined,
    });
    next();
  }

  return (
    <StepBase
      step={step}
      totalSteps={totalSteps}
      title="Your biometrics"
      subtitle="This helps us set accurate health reference ranges for you."
      onBack={back}
      ctaLabel="Continue"
      onCta={handleNext}
      ctaDisabled={!canContinue}
      skipLabel="Skip for now"
      onSkip={next}
    >
      {/* Age */}
      <View style={s.row}>
        <View style={[s.inputGroup, { flex: 1 }]}>
          <Text style={s.label}>Age</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. 35"
            placeholderTextColor="#9ca3af"
            keyboardType="number-pad"
            value={age}
            onChangeText={setAge}
            maxLength={3}
          />
        </View>
        <View style={[s.inputGroup, { flex: 2 }]}>
          <Text style={s.label}>Height</Text>
          <View style={s.heightRow}>
            <TextInput
              style={[s.input, s.heightInput]}
              placeholder="ft"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              value={heightFt}
              onChangeText={setHtFt}
              maxLength={1}
            />
            <TextInput
              style={[s.input, s.heightInput]}
              placeholder="in"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              value={heightIn}
              onChangeText={setHtIn}
              maxLength={2}
            />
          </View>
        </View>
        <View style={[s.inputGroup, { flex: 1.5 }]}>
          <Text style={s.label}>Weight (lbs)</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. 175"
            placeholderTextColor="#9ca3af"
            keyboardType="decimal-pad"
            value={weight}
            onChangeText={setWeight}
            maxLength={5}
          />
        </View>
      </View>

      {/* Biological sex */}
      <Text style={[s.label, { marginBottom: 10 }]}>Biological sex</Text>
      <View style={s.sexRow}>
        {SEX_OPTIONS.map(o => {
          const active = sex === o.value;
          return (
            <TouchableOpacity
              key={o.value}
              style={[s.sexBtn, active && s.sexBtnActive]}
              onPress={() => setSex(o.value)}
              activeOpacity={0.75}
            >
              <Text style={s.sexEmoji}>{o.emoji}</Text>
              <Text style={[s.sexLabel, active && s.sexLabelActive]}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={s.disclaimer}>
        Used only for personalised reference ranges. Never shared.
      </Text>
    </StepBase>
  );
}

const PURPLE = '#9333ea';

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fafafa',
  },
  heightRow: {
    flexDirection: 'row',
    gap: 6,
  },
  heightInput: {
    flex: 1,
    textAlign: 'center',
  },
  sexRow: {
    gap: 8,
    marginBottom: 16,
  },
  sexBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  sexBtnActive: {
    borderColor: PURPLE,
    backgroundColor: '#faf5ff',
  },
  sexEmoji: {
    fontSize: 18,
    color: '#374151',
  },
  sexLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  sexLabelActive: {
    color: PURPLE,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 4,
  },
});
