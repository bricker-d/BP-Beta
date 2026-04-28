import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Linking, ActivityIndicator,
} from 'react-native';
import StepBase from './StepBase';
import type { StepProps } from './types';

type WearableSource = 'Apple Health' | 'Whoop' | 'Oura' | 'Garmin' | 'none';

const API_BASE = 'https://bp-beta-9fdp-git-main-dan-brickers-projects.vercel.app';

const DEVICES: {
  value: WearableSource;
  label: string;
  emoji: string;
  desc: string;
  oauthProvider?: string;
}[] = [
  { value: 'Oura',         label: 'Oura Ring',  emoji: '💍', desc: 'Sleep, readiness, HRV',       oauthProvider: 'oura'  },
  { value: 'Whoop',        label: 'WHOOP',       emoji: '🔴', desc: 'Strain, recovery, HRV',       oauthProvider: 'whoop' },
  { value: 'Apple Health', label: 'Apple Health',emoji: '🍎', desc: 'iPhone steps, heart rate, sleep' },
  { value: 'Garmin',       label: 'Garmin',      emoji: '⌚', desc: 'Activity, VO2 max, sleep' },
  { value: 'none',         label: 'No wearable', emoji: '⊘', desc: 'You can connect one later' },
];

export default function StepWearables({ step, totalSteps, profile, update, next, back }: StepProps) {
  const [selected, setSelected]   = useState<WearableSource | ''>(profile.wearableSource ?? '');
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected]   = useState(false);

  async function handleConnect(device: typeof DEVICES[0]) {
    setSelected(device.value);

    // Devices with OAuth — open browser
    if (device.oauthProvider && profile.patientId) {
      setConnecting(true);
      const url = `${API_BASE}/api/wearables/${device.oauthProvider}/authorize?patientId=${profile.patientId}`;
      await Linking.openURL(url);
      setConnecting(false);
      setConnected(true); // Optimistic — user returns from browser
    }
  }

  function handleNext() {
    update({ wearableSource: selected as WearableSource || 'none' });
    next();
  }

  return (
    <StepBase
      step={step}
      totalSteps={totalSteps}
      title="Connect a wearable"
      subtitle="Your AI coach uses sleep, HRV, and activity data to personalise your daily actions."
      onBack={back}
      ctaLabel={connected ? 'Continue ✓' : 'Continue'}
      onCta={handleNext}
      ctaDisabled={!selected}
      skipLabel="Skip for now"
      onSkip={() => { update({ wearableSource: 'none' }); next(); }}
    >
      {DEVICES.map(d => {
        const active = selected === d.value;
        const isOAuth = !!d.oauthProvider;
        return (
          <TouchableOpacity
            key={d.value}
            style={[s.card, active && s.cardActive]}
            onPress={() => handleConnect(d)}
            activeOpacity={0.8}
          >
            <View style={s.iconBox}>
              <Text style={s.icon}>{d.emoji}</Text>
            </View>
            <View style={s.cardBody}>
              <Text style={[s.cardTitle, active && s.cardTitleActive]}>{d.label}</Text>
              <Text style={s.cardDesc}>{d.desc}</Text>
            </View>
            {connecting && active ? (
              <ActivityIndicator size="small" color="#9333ea" />
            ) : active && connected && isOAuth ? (
              <Text style={s.checkmark}>✓</Text>
            ) : (
              <View style={[s.radio, active && s.radioActive]}>
                {active && <View style={s.radioDot} />}
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      {connected && (
        <View style={s.connectedBanner}>
          <Text style={s.connectedTxt}>✓ Connected — data will sync automatically</Text>
        </View>
      )}

      <Text style={s.note}>Connections are read-only and can be removed at any time.</Text>
    </StepBase>
  );
}

const PURPLE = '#9333ea';

const s = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 14, borderWidth: 1.5, borderColor: '#e5e7eb',
    backgroundColor: '#fff', marginBottom: 10, gap: 12,
  },
  cardActive: { borderColor: PURPLE, backgroundColor: '#faf5ff' },
  iconBox: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 20 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  cardTitleActive: { color: PURPLE },
  cardDesc: { fontSize: 12, color: '#6b7280' },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: PURPLE },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: PURPLE },
  checkmark: { fontSize: 18, color: '#16a34a', fontWeight: '700' },
  connectedBanner: {
    backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12, marginTop: 4,
  },
  connectedTxt: { fontSize: 13, color: '#16a34a', fontWeight: '600', textAlign: 'center' },
  note: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 8, lineHeight: 16 },
});
