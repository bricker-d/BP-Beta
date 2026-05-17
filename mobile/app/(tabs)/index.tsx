import React, { useMemo, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Dimensions, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  FlaskConical, TrendingUp, TrendingDown, Minus,
  AlertTriangle, Zap, ChevronRight, Activity, CheckCircle2,
} from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { useHealthStore } from '../../lib/store';
import {
  biomarkerPriorityScore,
  BIOMARKER_REFS,
  computeHealthScore,
} from '../../lib/biomarkers';
import type { Biomarker } from '../../lib/types';
import DailyCheckIn from '../../lib/DailyCheckIn';
import type { DailyLog } from '../../lib/types';

const { width: SCREEN_W } = Dimensions.get('window');
const PURPLE = '#C96A2B';

// ── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { color: string; bg: string; label: string; icon: React.FC<any> }> = {
  optimal:     { color: '#2D8A5E', bg: '#EAF5EF', label: 'Optimal',     icon: Minus         },
  borderline:  { color: '#C07A1A', bg: '#FEF4DC', label: 'Borderline',  icon: AlertTriangle },
  elevated:    { color: '#B83232', bg: '#FAEBEB', label: 'Elevated',     icon: TrendingUp    },
  low:         { color: '#2B65A8', bg: '#E3EDF8', label: 'Low',          icon: TrendingDown  },
};

// ── Goal display config ───────────────────────────────────────────────────────
const GOAL_META: Record<string, { emoji: string; label: string }> = {
  longevity:        { emoji: '⏳', label: 'Longevity'        },
  weight_loss:      { emoji: '⚖️',  label: 'Weight Loss'      },
  energy:           { emoji: '⚡', label: 'Energy'           },
  muscle_gain:      { emoji: '💪', label: 'Muscle Gain'      },
  heart_health:     { emoji: '❤️',  label: 'Heart Health'     },
  hormone_balance:  { emoji: '🔄', label: 'Hormones'         },
  mental_clarity:   { emoji: '🧠', label: 'Mental Clarity'   },
  sleep:            { emoji: '🌙', label: 'Sleep'            },
};

// ── Mini biomarker card ───────────────────────────────────────────────────────
function BiomarkerMini({ b, goals, symptoms }: { b: Biomarker; goals: string[]; symptoms: string[] }) {
  const router = useRouter();
  const cfg = STATUS_CFG[b.status] ?? STATUS_CFG.optimal;
  const StatusIcon = cfg.icon;
  const ref = BIOMARKER_REFS[b.id];
  const score = biomarkerPriorityScore(b, { goals, symptoms });
  const priority = score >= 15 ? 'high' : score >= 8 ? 'watch' : 'monitor';
  const priorityColor = priority === 'high' ? '#dc2626' : priority === 'watch' ? '#d97706' : '#16a34a';

  return (
    <TouchableOpacity style={ms.card} onPress={() => router.push('/(tabs)/coach')} activeOpacity={0.7}>
      <View style={ms.cardTop}>
        <Text style={ms.cardName}>{ref?.name ?? b.id}</Text>
        <View style={[ms.badge, { backgroundColor: cfg.bg }]}>
          <StatusIcon color={cfg.color} size={10} />
          <Text style={[ms.badgeTxt, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
      <View style={ms.cardBot}>
        <Text style={ms.cardVal}>
          {b.value} <Text style={ms.cardUnit}>{b.unit}</Text>
        </Text>
        <View style={[ms.dot, { backgroundColor: priorityColor }]} />
      </View>
    </TouchableOpacity>
  );
}

// ── Action row ────────────────────────────────────────────────────────────────
function ActionRow({ label, done, onPress }: { label: string; done: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={ar.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[ar.check, done && ar.checkDone]}>
        {done && <Minus color="#fff" size={12} />}
      </View>
      <Text style={[ar.txt, done && ar.txtDone]} numberOfLines={1}>{label}</Text>
      <ChevronRight color="#9ca3af" size={16} />
    </TouchableOpacity>
  );
}

// ── Protocol card ─────────────────────────────────────────────────────────────
function ProtocolCard() {
  const { patientProtocol, protocolSteps, protocolLoading, toggleProtocolStep } = useHealthStore();

  if (protocolLoading) {
    return (
      <View style={pc.card}>
        <Text style={pc.loading}>Loading protocol...</Text>
      </View>
    );
  }

  if (!patientProtocol?.protocol) return null;

  const done  = protocolSteps.filter(s => s.completed).length;
  const total = protocolSteps.length;
  const pct   = total > 0 ? done / total : 0;
  const circumference = 2 * Math.PI * 18;

  return (
    <View style={pc.card}>
      {/* Header row */}
      <View style={pc.header}>
        <View style={pc.headerLeft}>
          <Text style={pc.label}>Active Protocol</Text>
          <Text style={pc.name} numberOfLines={1}>{patientProtocol.protocol.name}</Text>
        </View>
        {/* Mini progress ring */}
        <View style={pc.ringWrap}>
          <Svg width={44} height={44} viewBox="0 0 44 44">
            <Circle cx={22} cy={22} r={18} fill="none" stroke="#EAD9C5" strokeWidth={3.5} />
            <Circle
              cx={22} cy={22} r={18} fill="none"
              stroke={PURPLE} strokeWidth={3.5}
              strokeDasharray={`${circumference}`}
              strokeDashoffset={`${circumference * (1 - pct)}`}
              strokeLinecap="round"
              transform="rotate(-90 22 22)"
            />
          </Svg>
          <View style={pc.ringInner}>
            <Text style={pc.ringPct}>{Math.round(pct * 100)}</Text>
          </View>
        </View>
      </View>

      {/* Steps */}
      <View style={pc.steps}>
        {protocolSteps.filter(s => s.description !== '').slice(0, 5).map((step, i) => (
          <TouchableOpacity
            key={step.id}
            style={[pc.step, i < Math.min(protocolSteps.length, 5) - 1 && pc.stepBorder]}
            onPress={() => toggleProtocolStep(step.id)}
            activeOpacity={0.7}
          >
            <View style={[pc.circle, step.completed && pc.circleDone]}>
              {step.completed
                ? <CheckCircle2 color="#fff" size={13} />
                : <Text style={pc.circleNum}>{i + 1}</Text>
              }
            </View>
            <Text
              style={[pc.stepTxt, step.completed && pc.stepTxtDone]}
              numberOfLines={1}
            >
              {step.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {total > 5 && (
        <Text style={pc.more}>+{total - 5} more steps</Text>
      )}
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router   = useRouter();
  const { actions, intakeProfile, labPanel, streak, needsCheckIn, submitDailyLog, skipCheckIn } = useHealthStore();
  const [showCheckIn, setShowCheckIn] = useState(false);

  // Show check-in modal on mount if needed
  useEffect(() => {
    const timer = setTimeout(() => {
      if (needsCheckIn()) setShowCheckIn(true);
    }, 800); // slight delay so home screen renders first
    return () => clearTimeout(timer);
  }, []);

  const firstName = intakeProfile?.name?.split(' ')[0] ?? 'there';
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Health score
  const score = useMemo(() => {
    if (labPanel) return computeHealthScore(labPanel, intakeProfile);
    return null;
  }, [labPanel]);

  // Top priority biomarkers (sorted by priority score, take up to 6)
  const topBiomarkers = useMemo(() => {
    if (!labPanel) return [];
    const goals    = intakeProfile?.goals    ?? [];
    const symptoms = intakeProfile?.symptoms ?? [];
    return [...labPanel.biomarkers]
      .sort((a, b) => biomarkerPriorityScore(b, intakeProfile) - biomarkerPriorityScore(a, intakeProfile))
      .slice(0, 6);
  }, [labPanel, intakeProfile]);

  // Status counts
  const counts = useMemo(() => {
    if (!labPanel) return { optimal: 0, borderline: 0, elevated: 0, low: 0 };
    return labPanel.biomarkers.reduce((acc, b) => {
      acc[b.status as keyof typeof acc] = (acc[b.status as keyof typeof acc] ?? 0) + 1;
      return acc;
    }, { optimal: 0, borderline: 0, elevated: 0, low: 0 });
  }, [labPanel]);

  // Pending actions (first 3)
  const pendingActions = useMemo(() => actions.filter(a => !a.completed).slice(0, 3), [actions]);
  const doneCount      = useMemo(() => actions.filter(a => a.completed).length, [actions]);

  const goals    = intakeProfile?.goals    ?? [];
  const symptoms = intakeProfile?.symptoms ?? [];

  // ── Score ring colour ─────────────────────────────────────────────────────
  const scoreColor = score !== null
    ? score >= 75 ? '#2D8A5E' : score >= 50 ? '#C07A1A' : '#B83232'
    : PURPLE;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>{greeting}</Text>
            <Text style={s.name}>{firstName}</Text>
          </View>
          <TouchableOpacity
            style={s.avatarBtn}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.8}
          >
            <Text style={s.avatarBtnTxt}>
              {intakeProfile?.name
                ? intakeProfile.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                : '?'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Streak banner ───────────────────────────────────────────────── */}
        {(streak ?? 0) > 0 && (
          <View style={s.streakBanner}>
            <Text style={s.streakFire}>🔥</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.streakDays}>{streak}-day streak</Text>
              <Text style={s.streakSub}>Keep your protocol going</Text>
            </View>
            <View style={s.streakBadge}>
              <Text style={s.streakBadgeTxt}>{streak}</Text>
            </View>
          </View>
        )}

        {/* ── Protocol card ───────────────────────────────────────────────── */}
        <ProtocolCard />

        {/* ── Lab-dependent sections ──────────────────────────────────────── */}
        {labPanel && (
          <>
            {/* ── Score card ─────────────────────────────────────────────── */}
            <View style={s.scoreCard}>
              <View style={[s.scoreRing, { borderColor: scoreColor }]}>
                <Text style={[s.scoreNum, { color: scoreColor }]}>{score ?? '—'}</Text>
                <Text style={s.scoreLbl}>Score</Text>
              </View>
              <View style={s.scoreRight}>
                <Text style={s.scoreTitle}>Health Overview</Text>
                <View style={s.pillRow}>
                  {(['optimal','borderline','elevated','low'] as const).map(k => {
                    const cfg = STATUS_CFG[k];
                    const n   = counts[k];
                    if (!n) return null;
                    return (
                      <TouchableOpacity
                        key={k}
                        style={[s.pill, { backgroundColor: cfg.bg }]}
                        onPress={() => router.push('/(tabs)/labs')}
                      >
                        <Text style={[s.pillTxt, { color: cfg.color }]}>
                          {n} {cfg.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity style={s.viewLabsBtn} onPress={() => router.push('/(tabs)/labs')}>
                  <FlaskConical color={PURPLE} size={14} />
                  <Text style={s.viewLabsTxt}>View all labs</Text>
                  <ChevronRight color={PURPLE} size={14} />
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Goals ────────────────────────────────────────────────────── */}
            {goals.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Your Goals</Text>
                <View style={s.goalRow}>
                  {goals.map(g => {
                    const meta = GOAL_META[g] ?? { emoji: '🎯', label: g };
                    return (
                      <View key={g} style={s.goalChip}>
                        <Text style={s.goalEmoji}>{meta.emoji}</Text>
                        <Text style={s.goalLabel}>{meta.label}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ── Priority biomarkers ───────────────────────────────────────── */}
            <View style={s.section}>
              <View style={s.sectionHead}>
                <Text style={s.sectionTitle}>Priority Biomarkers</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/labs')}>
                  <Text style={s.seeAll}>See all</Text>
                </TouchableOpacity>
              </View>
              <View style={s.cardGrid}>
                {topBiomarkers.map(b => (
                  <BiomarkerMini key={b.id} b={b} goals={goals} symptoms={symptoms} />
                ))}
              </View>
            </View>

            {/* ── Actions ──────────────────────────────────────────────────── */}
            <View style={s.section}>
              <View style={s.sectionHead}>
                <Text style={s.sectionTitle}>
                  Today's Actions
                  {doneCount > 0 && (
                    <Text style={s.doneBadge}> · {doneCount} done</Text>
                  )}
                </Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/actions')}>
                  <Text style={s.seeAll}>See all</Text>
                </TouchableOpacity>
              </View>
              {pendingActions.length === 0 ? (
                <View style={s.allDone}>
                  <Activity color="#16a34a" size={20} />
                  <Text style={s.allDoneTxt}>All caught up! Great work.</Text>
                </View>
              ) : (
                <View style={s.actionsCard}>
                  {pendingActions.map((a) => (
                    <ActionRow
                      key={a.id}
                      label={a.title}
                      done={a.completed}
                      onPress={() => router.push('/(tabs)/actions')}
                    />
                  ))}
                </View>
              )}
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Daily check-in modal ─────────────────────────────────────── */}
      <Modal
        visible={showCheckIn}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { skipCheckIn(); setShowCheckIn(false); }}
      >
        <DailyCheckIn
          actions={actions.map(a => ({
            id: a.id,
            title: a.title,
            category: a.category,
            biomarkerTarget: a.biomarkerTarget,
          }))}
          firstName={firstName !== 'there' ? firstName : undefined}
          onComplete={(log: DailyLog) => {
            submitDailyLog(log);
            setShowCheckIn(false);
          }}
          onSkip={() => {
            skipCheckIn();
            setShowCheckIn(false);
          }}
        />
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#FDF7F0' },
  scroll:          { flex: 1, paddingHorizontal: 16 },
  empty:           { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  emptyTitle:      { fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center' },
  emptyBody:       { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  emptyBtn:        { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: PURPLE, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
  emptyBtnTxt:     { color: '#fff', fontWeight: '600', fontSize: 15 },

  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20 },
  greeting:        { fontSize: 13, color: '#9ca3af', fontFamily: 'DMSans_400Regular' },
  name:            { fontSize: 26, fontWeight: '700', color: '#111827', marginTop: 1, fontFamily: 'DMSans_700Bold' },

  streakBanner:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FEF0E6', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#EAD9C5' },
  streakFire:      { fontSize: 22 },
  streakDays:      { fontSize: 14, fontWeight: '700', color: '#C96A2B', fontFamily: 'DMSans_700Bold' },
  streakSub:       { fontSize: 12, color: '#B59A80', marginTop: 1, fontFamily: 'DMSans_400Regular' },
  streakBadge:     { width: 38, height: 38, borderRadius: 19, backgroundColor: '#C96A2B', alignItems: 'center', justifyContent: 'center' },
  streakBadgeTxt:  { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'DMSans_700Bold' },
  avatarBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  avatarBtnTxt:    { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'DMSans_700Bold' },

  scoreCard:       { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  scoreRing:       { width: 72, height: 72, borderRadius: 36, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  scoreNum:        { fontSize: 22, fontWeight: '800', lineHeight: 26 },
  scoreLbl:        { fontSize: 10, color: '#9ca3af', fontWeight: '600', letterSpacing: 0.5 },
  scoreRight:      { flex: 1 },
  scoreTitle:      { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 8 },
  pillRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  pill:            { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  pillTxt:         { fontSize: 11, fontWeight: '600' },
  viewLabsBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewLabsTxt:     { fontSize: 12, color: PURPLE, fontWeight: '600' },

  section:         { marginBottom: 20 },
  sectionHead:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle:    { fontSize: 16, fontWeight: '700', color: '#111827' },
  doneBadge:       { color: '#16a34a', fontWeight: '600' },
  seeAll:          { fontSize: 13, color: PURPLE, fontWeight: '600' },

  goalRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goalChip:        { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FEF0E6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  goalEmoji:       { fontSize: 14 },
  goalLabel:       { fontSize: 12, color: PURPLE, fontWeight: '600' },

  cardGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  actionsCard:     { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  allDone:         { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f0fdf4', borderRadius: 14, padding: 16 },
  allDoneTxt:      { fontSize: 14, color: '#16a34a', fontWeight: '600' },

  coachNudge:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FEF0E6', borderRadius: 14, padding: 16, marginBottom: 8 },
  coachNudgeLeft:  { flexDirection: 'row', alignItems: 'center' },
  coachNudgeTitle: { fontSize: 14, fontWeight: '700', color: '#1f2937' },
  coachNudgeSub:   { fontSize: 12, color: '#6b7280', marginTop: 1 },
});

// ── Mini card styles ──────────────────────────────────────────────────────────
const CARD_W = (SCREEN_W - 32 - 10) / 2;
const ms = StyleSheet.create({
  card:    { width: CARD_W, backgroundColor: '#fff', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardName:{ fontSize: 11, fontWeight: '600', color: '#374151', flex: 1, marginRight: 4 },
  badge:   { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  badgeTxt:{ fontSize: 9, fontWeight: '600' },
  cardBot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardVal: { fontSize: 17, fontWeight: '800', color: '#111827' },
  cardUnit:{ fontSize: 11, fontWeight: '400', color: '#9ca3af' },
  dot:     { width: 8, height: 8, borderRadius: 4 },
});

// ── Action row styles ─────────────────────────────────────────────────────────
const ar = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f3f4f6' },
  check:    { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  checkDone:{ backgroundColor: '#16a34a', borderColor: '#16a34a' },
  txt:      { flex: 1, fontSize: 14, color: '#374151' },
  txtDone:  { color: '#9ca3af', textDecorationLine: 'line-through' },
});

// ── Protocol card styles ──────────────────────────────────────────────────────
const pc = StyleSheet.create({
  card:       { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  loading:    { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 8 },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerLeft: { flex: 1, marginRight: 12 },
  label:      { fontSize: 11, fontWeight: '600', color: '#9ca3af', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 3 },
  name:       { fontSize: 16, fontWeight: '700', color: '#111827' },
  ringWrap:   { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  ringInner:  { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ringPct:    { fontSize: 11, fontWeight: '800', color: PURPLE },
  steps:      { gap: 0 },
  step:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  stepBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f3f4f6' },
  circle:     { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  circleDone: { backgroundColor: PURPLE, borderColor: PURPLE },
  circleNum:  { fontSize: 11, fontWeight: '700', color: '#9ca3af' },
  stepTxt:    { flex: 1, fontSize: 14, color: '#111827' },
  stepTxtDone:{ color: '#9ca3af', textDecorationLine: 'line-through' },
  more:       { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 8 },
});
