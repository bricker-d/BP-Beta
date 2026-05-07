import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView,
} from 'react-native';

export interface DailyLog {
  date: string;
  actionCompletions: Record<string, boolean>;
  sleepQuality: number | null;
  stressLevel: number | null;
  energyLevel: number | null;
}

interface Props {
  actions: Array<{ id: string; title: string; category: string; biomarkerTarget?: string }>;
  firstName?: string;
  onComplete: (log: DailyLog) => void;
  onSkip: () => void;
}

type Status = 'pending' | 'done' | 'missed';

const FEEL = {
  sleep: [
    { emoji: '😴', label: 'Rough',     value: 2 },
    { emoji: '😐', label: 'Okay',      value: 3 },
    { emoji: '🌙', label: 'Solid',     value: 5 },
  ],
  energy: [
    { emoji: '🪫', label: 'Drained',   value: 1 },
    { emoji: '😐', label: 'Okay',      value: 3 },
    { emoji: '⚡', label: 'Energised', value: 5 },
  ],
  stress: [
    { emoji: '😤', label: 'High',      value: 1 },
    { emoji: '😐', label: 'Moderate',  value: 3 },
    { emoji: '😌', label: 'Low',       value: 5 },
  ],
};

const ACCENT = '#C96A2B';

// ── Emoji picker row ──────────────────────────────────────────────────────────
function EmojiPicker({
  label, options, selected, onSelect,
}: {
  label: string;
  options: { emoji: string; label: string; value: number }[];
  selected: number | null;
  onSelect: (v: number) => void;
}) {
  return (
    <View style={ep.wrap}>
      <Text style={ep.label}>{label}</Text>
      <View style={ep.row}>
        {options.map(opt => {
          const active = selected === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[ep.btn, active && ep.btnActive]}
              onPress={() => onSelect(opt.value)}
              activeOpacity={0.7}
            >
              <Text style={ep.emoji}>{opt.emoji}</Text>
              <Text style={[ep.optLabel, active && ep.optLabelActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const ep = StyleSheet.create({
  wrap:         { marginBottom: 16 },
  label:        { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10, fontFamily: 'DMSans_600SemiBold' },
  row:          { flexDirection: 'row', gap: 10 },
  btn:          { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#fff', gap: 4 },
  btnActive:    { borderColor: ACCENT, backgroundColor: '#FEF0E6' },
  emoji:        { fontSize: 22 },
  optLabel:     { fontSize: 11, fontWeight: '500', color: '#9ca3af', fontFamily: 'DMSans_500Medium' },
  optLabelActive:{ color: ACCENT, fontWeight: '600', fontFamily: 'DMSans_600SemiBold' },
});

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DailyCheckIn({ actions, firstName, onComplete, onSkip }: Props) {
  const [statuses, setStatuses] = useState<Record<string, Status>>(
    Object.fromEntries(actions.map(a => [a.id, 'pending']))
  );
  const [sleep,  setSleep]  = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);

  const setStatus = (id: string, s: Status) =>
    setStatuses(prev => ({ ...prev, [id]: prev[id] === s ? 'pending' : s }));

  const doneCount = Object.values(statuses).filter(s => s === 'done').length;

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = firstName ? `, ${firstName}` : '';

  function submit() {
    onComplete({
      date: new Date().toISOString().split('T')[0],
      actionCompletions: Object.fromEntries(
        Object.entries(statuses).map(([id, s]) => [id, s === 'done'])
      ),
      sleepQuality: sleep,
      energyLevel:  energy,
      stressLevel:  stress,
    });
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={s.header}>
          <Text style={s.greeting}>{timeGreeting}{name}</Text>
          <Text style={s.title}>How did yesterday go?</Text>
          {actions.length > 0 && (
            <Text style={s.tally}>
              {doneCount} of {actions.length} actions completed
            </Text>
          )}
        </View>

        {/* Action cards */}
        {actions.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Yesterday's protocol</Text>
            <View style={s.actionList}>
              {actions.map(action => {
                const st = statuses[action.id];
                return (
                  <View
                    key={action.id}
                    style={[
                      s.actionCard,
                      st === 'done'   && s.actionCardDone,
                      st === 'missed' && s.actionCardMissed,
                    ]}
                  >
                    <Text style={[s.actionTitle, st === 'done' && s.actionTitleDone]}>
                      {action.title}
                    </Text>
                    {action.biomarkerTarget && (
                      <Text style={s.actionTarget}>Targets: {action.biomarkerTarget}</Text>
                    )}
                    <View style={s.actionBtns}>
                      <TouchableOpacity
                        style={[s.actionBtn, st === 'done' && s.actionBtnDone]}
                        onPress={() => setStatus(action.id, 'done')}
                        activeOpacity={0.75}
                      >
                        <Text style={[s.actionBtnTxt, st === 'done' && s.actionBtnTxtActive]}>
                          {st === 'done' ? '✓  Done' : 'Done'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.actionBtn, st === 'missed' && s.actionBtnMissed]}
                        onPress={() => setStatus(action.id, 'missed')}
                        activeOpacity={0.75}
                      >
                        <Text style={[s.actionBtnTxt, st === 'missed' && s.actionBtnTxtMissed]}>
                          Missed
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* How did you feel */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>How did you feel?</Text>
          <Text style={s.sectionSub}>Optional — your coach uses this to spot patterns</Text>
          <EmojiPicker label="Sleep"   options={FEEL.sleep}  selected={sleep}  onSelect={setSleep}  />
          <EmojiPicker label="Energy"  options={FEEL.energy} selected={energy} onSelect={setEnergy} />
          <EmojiPicker label="Stress"  options={FEEL.stress} selected={stress} onSelect={setStress} />
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Footer */}
      <View style={s.footer}>
        <TouchableOpacity style={s.skipBtn} onPress={onSkip}>
          <Text style={s.skipTxt}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.submitBtn} onPress={submit}>
          <Text style={s.submitTxt}>Log & start day →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#FDF7F0' },
  scroll: { flex: 1, paddingHorizontal: 20 },

  header:    { paddingTop: 28, paddingBottom: 24 },
  greeting:  { fontSize: 14, color: '#9ca3af', fontFamily: 'DMSans_400Regular', marginBottom: 4 },
  title:     { fontSize: 28, fontWeight: '700', color: '#111827', fontFamily: 'DMSans_700Bold', lineHeight: 34 },
  tally:     { fontSize: 14, color: '#C96A2B', fontWeight: '600', marginTop: 6, fontFamily: 'DMSans_600SemiBold' },

  section:     { marginBottom: 28 },
  sectionLabel:{ fontSize: 12, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4, fontFamily: 'DMSans_700Bold' },
  sectionSub:  { fontSize: 13, color: '#B59A80', marginBottom: 16, fontFamily: 'DMSans_400Regular' },

  actionList: { gap: 10 },
  actionCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  actionCardDone:   { borderColor: '#2D8A5E', backgroundColor: '#EAF5EF' },
  actionCardMissed: { borderColor: '#e5e7eb', backgroundColor: '#fafafa', opacity: 0.7 },
  actionTitle:     { fontSize: 15, fontWeight: '600', color: '#111827', lineHeight: 21, fontFamily: 'DMSans_600SemiBold', marginBottom: 4 },
  actionTitleDone: { color: '#2D8A5E' },
  actionTarget:    { fontSize: 12, color: '#9ca3af', marginBottom: 12, fontFamily: 'DMSans_400Regular' },

  actionBtns:       { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn:        { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: '#e5e7eb', alignItems: 'center', backgroundColor: '#fff' },
  actionBtnDone:    { borderColor: '#2D8A5E', backgroundColor: '#2D8A5E' },
  actionBtnMissed:  { borderColor: '#d1d5db', backgroundColor: '#f3f4f6' },
  actionBtnTxt:     { fontSize: 13, fontWeight: '600', color: '#6b7280', fontFamily: 'DMSans_600SemiBold' },
  actionBtnTxtActive:{ color: '#fff' },
  actionBtnTxtMissed:{ color: '#9ca3af' },

  footer: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: '#EAD9C5',
    backgroundColor: '#FDF7F0',
  },
  skipBtn:   { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1.5, borderColor: '#d1d5db', alignItems: 'center' },
  skipTxt:   { fontSize: 14, fontWeight: '500', color: '#9ca3af', fontFamily: 'DMSans_500Medium' },
  submitBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: ACCENT, alignItems: 'center' },
  submitTxt: { fontSize: 15, fontWeight: '700', color: '#fff', fontFamily: 'DMSans_700Bold' },
});
