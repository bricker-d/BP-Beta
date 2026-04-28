import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';

interface DailyCheckInProps {
  actions: Array<{ id: string; title: string; category: string; biomarkerTarget?: string }>;
  onComplete: (log: DailyLog) => void;
  onSkip: () => void;
}

export interface DailyLog {
  date: string;
  actionCompletions: Record<string, boolean>;
  sleepQuality: number | null;   // 1–5
  stressLevel: number | null;    // 1–5
  energyLevel: number | null;    // 1–5
}

const QUALITY_LABELS = ['Terrible', 'Poor', 'OK', 'Good', 'Great'];
const PURPLE = '#9333ea';

export default function DailyCheckIn({ actions, onComplete, onSkip }: DailyCheckInProps) {
  const [completions, setCompletions] = useState<Record<string, boolean>>(
    Object.fromEntries(actions.map(a => [a.id, false]))
  );
  const [sleep, setSleep]   = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);

  function toggle(id: string) {
    setCompletions(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function submit() {
    onComplete({
      date: new Date().toISOString().split('T')[0],
      actionCompletions: completions,
      sleepQuality: sleep,
      stressLevel: stress,
      energyLevel: energy,
    });
  }

  const doneCount = Object.values(completions).filter(Boolean).length;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.title}>Morning check-in</Text>
          <Text style={s.sub}>How did yesterday go?</Text>
        </View>

        {/* Action completions */}
        <Text style={s.sectionLabel}>Yesterday's actions</Text>
        <Text style={s.sectionSub}>{doneCount}/{actions.length} completed</Text>

        <View style={s.actionList}>
          {actions.map(action => {
            const done = completions[action.id];
            return (
              <TouchableOpacity
                key={action.id}
                style={[s.actionRow, done && s.actionRowDone]}
                onPress={() => toggle(action.id)}
                activeOpacity={0.8}
              >
                <View style={[s.checkbox, done && s.checkboxDone]}>
                  {done && <Text style={s.checkmark}>✓</Text>}
                </View>
                <View style={s.actionText}>
                  <Text style={[s.actionTitle, done && s.actionTitleDone]}>{action.title}</Text>
                  {action.biomarkerTarget && (
                    <Text style={s.actionTarget}>{action.biomarkerTarget}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* How did you feel? */}
        <Text style={[s.sectionLabel, { marginTop: 24 }]}>How did you feel?</Text>
        <Text style={s.sectionSub}>Optional — helps correlate actions to outcomes</Text>

        <RatingRow label="Sleep quality" value={sleep} onChange={setSleep} />
        <RatingRow label="Energy level"  value={energy} onChange={setEnergy} />
        <RatingRow label="Stress level"  value={stress} onChange={setStress} invert />

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Footer */}
      <View style={s.footer}>
        <TouchableOpacity style={s.skipBtn} onPress={onSkip}>
          <Text style={s.skipTxt}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.submitBtn} onPress={submit}>
          <Text style={s.submitTxt}>Log & start day</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function RatingRow({
  label,
  value,
  onChange,
  invert = false,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  invert?: boolean;
}) {
  return (
    <View style={s.ratingGroup}>
      <Text style={s.ratingLabel}>{label}</Text>
      <View style={s.ratingRow}>
        {[1, 2, 3, 4, 5].map(n => {
          const active = value === n;
          const color = invert
            ? n <= 2 ? '#22c55e' : n === 3 ? '#f59e0b' : '#ef4444'
            : n <= 2 ? '#ef4444' : n === 3 ? '#f59e0b' : '#22c55e';
          return (
            <TouchableOpacity
              key={n}
              style={[s.ratingDot, { borderColor: active ? color : '#e5e7eb', backgroundColor: active ? color : '#fff' }]}
              onPress={() => onChange(n)}
            >
              <Text style={[s.ratingNum, { color: active ? '#fff' : '#9ca3af' }]}>{n}</Text>
            </TouchableOpacity>
          );
        })}
        {value && (
          <Text style={s.ratingCaption}>{QUALITY_LABELS[value - 1]}</Text>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { flex: 1, paddingHorizontal: 20 },
  header: { paddingTop: 24, paddingBottom: 20 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827' },
  sub:   { fontSize: 15, color: '#6b7280', marginTop: 4 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#111827', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionSub:   { fontSize: 13, color: '#9ca3af', marginTop: 2, marginBottom: 14 },
  actionList: { gap: 10 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  actionRowDone: { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  checkbox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: '#d1d5db',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  actionText: { flex: 1 },
  actionTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  actionTitleDone: { color: '#15803d', textDecorationLine: 'line-through' },
  actionTarget: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  ratingGroup: { marginBottom: 16 },
  ratingLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingDot: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  ratingNum: { fontSize: 15, fontWeight: '700' },
  ratingCaption: { fontSize: 13, color: '#6b7280', marginLeft: 4, fontWeight: '500' },
  footer: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: '#f3f4f6',
    backgroundColor: '#fff',
  },
  skipBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  skipTxt: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
  submitBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 12,
    backgroundColor: PURPLE, alignItems: 'center',
  },
  submitTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
