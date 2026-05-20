import React, { useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  CheckCircle2, Circle, ClipboardList, Info,
} from 'lucide-react-native';
import { useHealthStore } from '../../lib/store';
import type { ProtocolStep } from '../../lib/types';

const BRAND = '#C96A2B';

const TIME_SLOTS = ['Morning', 'Afternoon', 'Evening'] as const;
type TimeSlot = typeof TIME_SLOTS[number];

function inferSlot(title: string, desc?: string): TimeSlot {
  const text = (title + ' ' + (desc ?? '')).toLowerCase();
  if (/morning|sunlight|wak|check.in|readiness|wake/.test(text)) return 'Morning';
  if (/bed|sleep|alcohol|evening|night|before sleep/.test(text))  return 'Evening';
  return 'Afternoon';
}

function StepCard({ step, index, onToggle }: { step: ProtocolStep; index: number; onToggle: () => void }) {
  return (
    <TouchableOpacity
      style={[card.wrap, step.completed && card.wrapDone]}
      onPress={onToggle}
      activeOpacity={0.75}
    >
      <View style={[card.circle, step.completed && card.circleDone]}>
        {step.completed
          ? <CheckCircle2 color="#fff" size={16} />
          : <Circle color="#d1d5db" size={16} />
        }
      </View>

      <View style={card.body}>
        <Text style={[card.title, step.completed && card.titleDone]} numberOfLines={2}>
          {step.title}
        </Text>
        {!!step.description && (
          <Text style={[card.desc, step.completed && card.descDone]} numberOfLines={3}>
            {step.description}
          </Text>
        )}
        {!!step.mechanism && !step.completed && (
          <View style={card.mechRow}>
            <Info color="#9ca3af" size={10} />
            <Text style={card.mechTxt} numberOfLines={2}>{step.mechanism}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function TimeSlotSection({ slot, steps, onToggle }: {
  slot: TimeSlot;
  steps: ProtocolStep[];
  onToggle: (id: string) => void;
}) {
  const done = steps.filter(s => s.completed).length;
  return (
    <View style={ts.section}>
      <View style={ts.header}>
        <Text style={ts.label}>{slot}</Text>
        {done > 0 && (
          <Text style={ts.done}>{done}/{steps.length}</Text>
        )}
      </View>
      {steps.map((step, i) => (
        <StepCard key={step.id} step={step} index={i} onToggle={() => onToggle(step.id)} />
      ))}
    </View>
  );
}

export default function ProtocolsScreen() {
  const router = useRouter();
  const {
    patientProtocol,
    protocolSteps,
    protocolLoading,
    fetchProtocol,
    toggleProtocolStep,
    patientId,
    hasCompletedOnboarding,
  } = useHealthStore();

  useEffect(() => {
    if (patientId) fetchProtocol();
  }, [patientId]);

  const handleToggle = useCallback((id: string) => {
    toggleProtocolStep(id);
  }, [toggleProtocolStep]);

  const doneCount = protocolSteps.filter(s => s.completed).length;
  const total     = protocolSteps.length;
  const pct       = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  // Group steps by time slot
  const grouped: Record<TimeSlot, ProtocolStep[]> = { Morning: [], Afternoon: [], Evening: [] };
  for (const step of protocolSteps) {
    grouped[inferSlot(step.title, step.description)].push(step);
  }

  if (!hasCompletedOnboarding) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.empty}>
          <ClipboardList color={BRAND} size={52} />
          <Text style={s.emptyTitle}>Complete onboarding first</Text>
          <Text style={s.emptyBody}>
            Finish setup so your care team can assign you a personalised protocol.
          </Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/(onboarding)')}>
            <Text style={s.emptyBtnTxt}>Start Onboarding</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (protocolLoading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadWrap}>
          <ActivityIndicator color={BRAND} size="large" />
          <Text style={s.loadTxt}>Loading your protocol…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!patientProtocol || protocolSteps.length === 0) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <Text style={s.title}>Protocol</Text>
        </View>
        <View style={s.empty}>
          <ClipboardList color="#d1d5db" size={52} />
          <Text style={s.emptyTitle}>No protocol assigned yet</Text>
          <Text style={s.emptyBody}>
            Your care team will assign a personalised protocol based on your labs and goals.
          </Text>
          <TouchableOpacity style={s.refreshBtn} onPress={fetchProtocol}>
            <Text style={s.refreshBtnTxt}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={s.title}>{patientProtocol.protocol.name}</Text>
          {!!patientProtocol.protocol.description && (
            <Text style={s.subtitle} numberOfLines={2}>
              {patientProtocol.protocol.description}
            </Text>
          )}
        </View>
        <View style={s.scoreBubble}>
          <Text style={s.scoreNum}>{pct}%</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${pct}%` as any }]} />
      </View>

      <View style={s.progressRow}>
        <Text style={s.progressTxt}>{doneCount} of {total} steps complete today</Text>
        {doneCount === total && total > 0 && (
          <View style={s.completeBadge}>
            <Text style={s.completeBadgeTxt}>All done!</Text>
          </View>
        )}
      </View>

      {/* Steps grouped by time */}
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {TIME_SLOTS.filter(slot => grouped[slot].length > 0).map(slot => (
          <TimeSlotSection
            key={slot}
            slot={slot}
            steps={grouped[slot]}
            onToggle={handleToggle}
          />
        ))}

        {!!patientProtocol.notes && (
          <View style={s.notesCard}>
            <Text style={s.notesLabel}>Note from your care team</Text>
            <Text style={s.notesTxt}>{patientProtocol.notes}</Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#FDF7F0' },
  loadWrap:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadTxt:          { fontSize: 14, color: '#9ca3af' },
  empty:            { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  emptyTitle:       { fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center', fontFamily: 'DMSans_700Bold' },
  emptyBody:        { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, fontFamily: 'DMSans_400Regular' },
  emptyBtn:         { backgroundColor: BRAND, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  emptyBtnTxt:      { color: '#fff', fontWeight: '600', fontSize: 15 },
  refreshBtn:       { borderWidth: 1.5, borderColor: BRAND, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 24 },
  refreshBtnTxt:    { color: BRAND, fontWeight: '600', fontSize: 14 },

  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  title:            { fontSize: 22, fontWeight: '700', color: '#111827', fontFamily: 'DMSans_700Bold' },
  subtitle:         { fontSize: 13, color: '#6b7280', marginTop: 3, lineHeight: 18, fontFamily: 'DMSans_400Regular' },
  scoreBubble:      { width: 50, height: 50, borderRadius: 25, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  scoreNum:         { fontSize: 15, fontWeight: '800', color: '#fff' },

  barTrack:         { height: 4, backgroundColor: '#e5e7eb' },
  barFill:          { height: 4, backgroundColor: BRAND, borderRadius: 2 },

  progressRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  progressTxt:      { fontSize: 13, color: '#6b7280', fontFamily: 'DMSans_400Regular' },
  completeBadge:    { backgroundColor: '#f0fdf4', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#bbf7d0' },
  completeBadgeTxt: { fontSize: 12, color: '#15803d', fontWeight: '600' },

  scroll:           { flex: 1, padding: 16 },

  notesCard:        { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginTop: 4, borderWidth: 1, borderColor: '#e5e7eb' },
  notesLabel:       { fontSize: 11, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  notesTxt:         { fontSize: 14, color: '#374151', lineHeight: 20 },
});

const ts = StyleSheet.create({
  section: { marginBottom: 20 },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  label:   { fontSize: 11, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8 },
  done:    { fontSize: 11, fontWeight: '600', color: '#16a34a' },
});

const card = StyleSheet.create({
  wrap:      { backgroundColor: '#fff', borderRadius: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  wrapDone:  { opacity: 0.55 },
  circle:    { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  circleDone:{ backgroundColor: BRAND, borderColor: BRAND },
  body:      { flex: 1, gap: 4 },
  title:     { fontSize: 14, fontWeight: '600', color: '#1f2937', lineHeight: 20, fontFamily: 'DMSans_600SemiBold' },
  titleDone: { color: '#9ca3af', textDecorationLine: 'line-through' },
  desc:      { fontSize: 13, color: '#6b7280', lineHeight: 18, fontFamily: 'DMSans_400Regular' },
  descDone:  { color: '#d1d5db' },
  mechRow:   { flexDirection: 'row', gap: 5, alignItems: 'flex-start', backgroundColor: '#f9fafb', borderRadius: 8, padding: 8, marginTop: 2 },
  mechTxt:   { flex: 1, fontSize: 11, color: '#6b7280', lineHeight: 15, fontStyle: 'italic' },
});
