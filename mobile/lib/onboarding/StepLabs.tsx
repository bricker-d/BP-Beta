import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import StepBase from './StepBase';
import type { StepProps } from './types';

type LabSource = 'upload' | 'demo' | 'skip';

const OPTIONS: { value: LabSource; label: string; subtitle: string; emoji: string }[] = [
  {
    value: 'upload',
    label: 'Upload my labs',
    subtitle: 'Paste a PDF link or enter values manually',
    emoji: '📋',
  },
  {
    value: 'demo',
    label: 'Use demo data',
    subtitle: 'See the app with realistic sample lab results',
    emoji: '🔬',
  },
  {
    value: 'skip',
    label: 'Skip for now',
    subtitle: 'You can add labs later from the Labs tab',
    emoji: '⏭️',
  },
];

export default function StepLabs({ step, totalSteps, profile, update, next, back }: StepProps) {
  const [selected, setSelected] = useState<LabSource | ''>(profile.labDataSource ?? '');
  const [loading, setLoading] = useState(false);

  async function handleNext() {
    if (!selected) return;
    setLoading(true);
    // Small artificial delay so "demo" selection feels deliberate
    await new Promise(r => setTimeout(r, selected === 'demo' ? 800 : 0));
    update({ labDataSource: selected });
    setLoading(false);
    next();
  }

  return (
    <StepBase
      step={step}
      totalSteps={totalSteps}
      title="Your lab results"
      subtitle="Bioprecision is most powerful when it can see your bloodwork."
      onBack={back}
      ctaLabel={loading ? 'Loading...' : 'Continue'}
      onCta={handleNext}
      ctaDisabled={!selected || loading}
    >
      {OPTIONS.map(o => {
        const active = selected === o.value;
        return (
          <TouchableOpacity
            key={o.value}
            style={[s.card, active && s.cardActive]}
            onPress={() => setSelected(o.value)}
            activeOpacity={0.8}
          >
            <View style={s.cardLeft}>
              <Text style={s.cardEmoji}>{o.emoji}</Text>
            </View>
            <View style={s.cardBody}>
              <Text style={[s.cardTitle, active && s.cardTitleActive]}>{o.label}</Text>
              <Text style={s.cardSub}>{o.subtitle}</Text>
            </View>
            <View style={[s.radio, active && s.radioActive]}>
              {active && <View style={s.radioDot} />}
            </View>
          </TouchableOpacity>
        );
      })}

      {loading && (
        <View style={s.loadingRow}>
          <ActivityIndicator size="small" color="#9333ea" />
          <Text style={s.loadingTxt}>Loading demo data…</Text>
        </View>
      )}

      <Text style={s.notice}>
        We never store or share your medical data. Everything stays on your device.
      </Text>
    </StepBase>
  );
}

const PURPLE = '#9333ea';

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    marginBottom: 12,
    gap: 12,
  },
  cardActive: {
    borderColor: PURPLE,
    backgroundColor: '#faf5ff',
  },
  cardLeft: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: { fontSize: 20 },
  cardBody: { flex: 1, gap: 2 },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  cardTitleActive: { color: PURPLE },
  cardSub: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 17,
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
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  loadingTxt: {
    fontSize: 13,
    color: PURPLE,
  },
  notice: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
});
