import React, { useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Animated, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  CheckCircle2, Circle, ClipboardList, ChevronRight,
  FlaskConical, Flame, Leaf, Dumbbell, Moon, Pill, Target,
  Info, Clock, TrendingUp,
} from 'lucide-react-native';
import { useHealthStore } from '../../lib/store';
import type { ProtocolStep } from '../../lib/types';

const BRAND = '#C96A2B';

const CAT_CFG: Record<string, { bg: string; text: string; border: string; icon: React.FC<any>; emoji: string }> = {
  Movement:   { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', icon: Flame,    emoji: '🏃' },
  Nutrition:  { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', icon: Leaf,     emoji: '🥗' },
  Exercise:   { bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc', icon: Dumbbell, emoji: '💪' },
  Sleep:      { bg: '#FDF7F0', text: '#C96A2B', border: '#EAD9C5', icon: Moon,     emoji: '🌙' },
  Supplement: { bg: '#fffbeb', text: '#b45309', border: '#fde68a', icon: Pill,     emoji: '💊' },
  Lifestyle:  { bg: '#fff1f2', text: '#be123c', border: '#fecdd3', icon: Target,   emoji: '🎯' },
};

function ProtocolStepCard({ step, onToggle }: { step: ProtocolStep; onToggle: () => void }) {
  const cat = CAT_CFG[step.category] ?? CAT_CFG.Lifestyle;
  const checkScale = useRef(new Animated.Value(step.completed ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(checkScale, {
      toValue: step.completed ? 1 : 0,
      useNativeDriver: true,
      damping: 10,
      stiffness: 200,
      mass: 0.8,
    }).start();
  }, [step.completed]);

  return (
    <View style={[card.wrap, step.completed && card.wrapDone, { borderLeftColor: cat.border, borderLeftWidth: 3 }]}>
      <TouchableOpacity style={card.row} onPress={onToggle} activeOpacity={0.7}>
        <View style={[card.check, { borderColor: step.completed ? '#2D8A5E' : '#d1d5db' }, step.completed && { backgroundColor: '#2D8A5E' }]}>
          <Animated.View style={{ transform: [{ scale: checkScale }] }}>
            {step.completed
              ? <CheckCircle2 color="#fff" size={18} />
              : <Circle color="#d1d5db" size={18} />
            }
          </Animated.View>
        </View>

        <View style={card.body}>
          <View style={[card.chip, { backgroundColor: cat.bg, borderColor: cat.border }]}>
            <Text style={card.chipEmoji}>{cat.emoji}</Text>
            <Text style={[card.chipTxt, { color: cat.text }]}>{step.category}</Text>
          </View>

          <Text style={[card.title, step.completed && card.titleDone]} numberOfLines={2}>
            {step.title}
          </Text>

          {!!step.description && (
            <Text style={[card.desc, step.completed && card.descDone]} numberOfLines={3}>
              {step.description}
            </Text>
          )}

          {/* Biomarker targets */}
          {!!step.biomarkerTargets?.length && (
            <View style={card.metaRow}>
              <FlaskConical color={BRAND} size={11} />
              <Text style={card.metaTxt}>Targets: {step.biomarkerTargets.join(', ')}</Text>
            </View>
          )}

          {/* Time to effect + evidence */}
          <View style={card.tagRow}>
            {!!step.timeToEffect && (
              <View style={card.tag}>
                <Clock color="#6b7280" size={10} />
                <Text style={card.tagTxt}>{step.timeToEffect}</Text>
              </View>
            )}
            {!!step.effectSize && (
              <View style={card.tag}>
                <TrendingUp color="#6b7280" size={10} />
                <Text style={card.tagTxt}>{step.effectSize}</Text>
              </View>
            )}
            {!!step.evidenceGrade && (
              <View style={[card.tag, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
                <Text style={[card.tagTxt, { color: '#15803d' }]}>Grade {step.evidenceGrade}</Text>
              </View>
            )}
          </View>

          {/* Mechanism (expandable) */}
          {!!step.mechanism && !step.completed && (
            <View style={card.mechBox}>
              <Info color="#9ca3af" size={11} />
              <Text style={card.mechTxt} numberOfLines={2}>{step.mechanism}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
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

  const handleToggle = useCallback((step: ProtocolStep) => {
    toggleProtocolStep(step.id);
  }, [toggleProtocolStep]);

  const doneCount = protocolSteps.filter(s => s.completed).length;
  const total = protocolSteps.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  // Not onboarded yet
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

  // Loading
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

  // No protocol assigned
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
            Your care team will assign a personalised protocol based on your lab results and goals. Check back after your next appointment.
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
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
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

      {/* ── Progress bar ──────────────────────────────────────────────── */}
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${pct}%` as any }]} />
      </View>

      {/* ── Progress summary ──────────────────────────────────────────── */}
      <View style={s.progressRow}>
        <Text style={s.progressTxt}>
          {doneCount} of {total} steps complete
        </Text>
        {doneCount === total && total > 0 && (
          <View style={s.completeBadge}>
            <Text style={s.completeBadgeTxt}>All done! 🎉</Text>
          </View>
        )}
      </View>

      {/* ── Steps list ───────────────────────────────────────────────── */}
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {protocolSteps.map((step) => (
          <ProtocolStepCard
            key={step.id}
            step={step}
            onToggle={() => handleToggle(step)}
          />
        ))}

        {/* Notes from practitioner */}
        {!!patientProtocol.notes && (
          <View style={s.notesCard}>
            <Text style={s.notesLabel}>Note from your care team</Text>
            <Text style={s.notesTxt}>{patientProtocol.notes}</Text>
          </View>
        )}

        {/* Assigned date */}
        <Text style={s.assignedTxt}>
          Assigned {new Date(patientProtocol.assigned_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </Text>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#FDF7F0' },
  loadWrap:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadTxt:        { fontSize: 14, color: '#9ca3af' },
  empty:          { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  emptyTitle:     { fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center', fontFamily: 'DMSans_700Bold' },
  emptyBody:      { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, fontFamily: 'DMSans_400Regular' },
  emptyBtn:       { backgroundColor: BRAND, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  emptyBtnTxt:    { color: '#fff', fontWeight: '600', fontSize: 15 },
  refreshBtn:     { borderWidth: 1.5, borderColor: BRAND, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 24 },
  refreshBtnTxt:  { color: BRAND, fontWeight: '600', fontSize: 14 },

  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  headerLeft:     { flex: 1, marginRight: 12 },
  title:          { fontSize: 22, fontWeight: '700', color: '#111827', fontFamily: 'DMSans_700Bold' },
  subtitle:       { fontSize: 13, color: '#6b7280', marginTop: 3, lineHeight: 18, fontFamily: 'DMSans_400Regular' },
  scoreBubble:    { width: 50, height: 50, borderRadius: 25, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  scoreNum:       { fontSize: 15, fontWeight: '800', color: '#fff' },

  barTrack:       { height: 4, backgroundColor: '#e5e7eb' },
  barFill:        { height: 4, backgroundColor: BRAND, borderRadius: 2 },

  progressRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  progressTxt:    { fontSize: 13, color: '#6b7280', fontFamily: 'DMSans_400Regular' },
  completeBadge:  { backgroundColor: '#f0fdf4', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#bbf7d0' },
  completeBadgeTxt: { fontSize: 12, color: '#15803d', fontWeight: '600' },

  scroll:         { flex: 1, paddingHorizontal: 16, paddingTop: 12 },

  notesCard:      { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  notesLabel:     { fontSize: 11, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  notesTxt:       { fontSize: 14, color: '#374151', lineHeight: 20 },

  assignedTxt:    { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginBottom: 8, fontFamily: 'DMSans_400Regular' },
});

const card = StyleSheet.create({
  wrap:       { backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  wrapDone:   { opacity: 0.65 },
  row:        { flexDirection: 'row', padding: 16, gap: 14, alignItems: 'flex-start' },
  check:      { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0 },
  body:       { flex: 1, gap: 4 },
  chip:       { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1, marginBottom: 2 },
  chipEmoji:  { fontSize: 11 },
  chipTxt:    { fontSize: 11, fontWeight: '600' },
  title:      { fontSize: 14, fontWeight: '600', color: '#1f2937', lineHeight: 20, fontFamily: 'DMSans_600SemiBold' },
  titleDone:  { color: '#9ca3af', textDecorationLine: 'line-through' },
  desc:       { fontSize: 13, color: '#6b7280', lineHeight: 18, fontFamily: 'DMSans_400Regular' },
  descDone:   { color: '#d1d5db' },
  metaRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaTxt:    { fontSize: 11, color: BRAND, fontWeight: '500' },
  tagRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  tag:        { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  tagTxt:     { fontSize: 10, color: '#6b7280', fontWeight: '500' },
  mechBox:    { flexDirection: 'row', gap: 5, alignItems: 'flex-start', backgroundColor: '#f9fafb', borderRadius: 8, padding: 8, marginTop: 4 },
  mechTxt:    { flex: 1, fontSize: 11, color: '#6b7280', lineHeight: 15, fontStyle: 'italic' },
});
