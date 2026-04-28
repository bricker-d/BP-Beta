import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FlaskConical, AlertTriangle, TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown } from 'lucide-react-native';
import { useHealthStore } from '../../lib/store';
import {
  biomarkerPriorityScore,
  BIOMARKER_REFS,
  computeHealthScore,
} from '../../lib/biomarkers';
import type { Biomarker } from '../../lib/types';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Status config ──────────────────────────────────────────────────────────

const STATUS: Record<string, { color: string; bg: string; label: string; icon: React.FC<any> }> = {
  optimal:    { color: '#16a34a', bg: '#dcfce7', label: 'Optimal',    icon: Minus },
  borderline: { color: '#d97706', bg: '#fef3c7', label: 'Borderline', icon: AlertTriangle },
  elevated:   { color: '#dc2626', bg: '#fee2e2', label: 'Elevated',   icon: TrendingUp },
  low:        { color: '#2563eb', bg: '#dbeafe', label: 'Low',        icon: TrendingDown },
};


// ─── Delta badge ─────────────────────────────────────────────────────────────

function DeltaBadge({ biomarker }: { biomarker: Biomarker }) {
  if (biomarker.delta === undefined || biomarker.deltaStatus === 'stable') return null;
  const improved = biomarker.deltaStatus === 'improved';
  const color = improved ? '#16a34a' : '#dc2626';
  const bg    = improved ? '#dcfce7' : '#fee2e2';
  const sign  = biomarker.delta > 0 ? '+' : '';
  return (
    <View style={[db.badge, { backgroundColor: bg }]}>
      {improved
        ? <ArrowDown color={color} size={10} />
        : <ArrowUp color={color} size={10} />
      }
      <Text style={[db.txt, { color }]}>{sign}{biomarker.delta} {biomarker.unit}</Text>
    </View>
  );
}

const db = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  txt:   { fontSize: 10, fontWeight: '700' },
});

// ─── Category filter config ──────────────────────────────────────────────────

const CATEGORIES: { key: string; label: string; emoji: string }[] = [
  { key: 'all',          label: 'All',          emoji: '🔬' },
  { key: 'metabolic',    label: 'Metabolic',    emoji: '⚡' },
  { key: 'lipid',        label: 'Lipids',       emoji: '🫀' },
  { key: 'hormone',      label: 'Hormones',     emoji: '🧬' },
  { key: 'inflammatory', label: 'Inflammation', emoji: '🔥' },
  { key: 'vitamin',      label: 'Vitamins',     emoji: '💊' },
];

// ─── Range bar ──────────────────────────────────────────────────────────────

function RangeBar({ biomarker }: { biomarker: Biomarker }) {
  const cfg = STATUS[biomarker.status] ?? STATUS.optimal;
  // Position the dot: map value between [optimalMin * 0.4, optimalMax * 1.6]
  const lo = biomarker.optimalMin * 0.4;
  const hi = biomarker.optimalMax * 1.6;
  const pct = Math.min(97, Math.max(3, ((biomarker.value - lo) / (hi - lo)) * 100));
  return (
    <View style={rb.wrap}>
      <View style={rb.track}>
        {/* Optimal zone highlight */}
        <View
          style={[
            rb.optimalZone,
            {
              left: `${((biomarker.optimalMin - lo) / (hi - lo)) * 100}%`,
              right: `${100 - ((biomarker.optimalMax - lo) / (hi - lo)) * 100}%`,
            } as any,
          ]}
        />
        {/* Value dot */}
        <View style={[rb.dot, { left: `${pct}%`, backgroundColor: cfg.color } as any]} />
      </View>
      <View style={rb.labels}>
        <Text style={rb.labelTxt}>{biomarker.optimalMin}</Text>
        <Text style={[rb.rangeTxt, { color: cfg.color }]}>
          Optimal {biomarker.optimalMin}–{biomarker.optimalMax} {biomarker.unit}
        </Text>
        <Text style={rb.labelTxt}>{biomarker.optimalMax}</Text>
      </View>
    </View>
  );
}

const rb = StyleSheet.create({
  wrap:       { marginTop: 8 },
  track:      { height: 8, backgroundColor: '#f3f4f6', borderRadius: 4, position: 'relative', overflow: 'visible' },
  optimalZone:{ position: 'absolute', top: 0, bottom: 0, backgroundColor: '#bbf7d0', borderRadius: 4 },
  dot:        { position: 'absolute', width: 14, height: 14, borderRadius: 7, top: -3, marginLeft: -7, borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 2, elevation: 2 },
  labels:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  labelTxt:   { fontSize: 10, color: '#9ca3af', fontWeight: '500' },
  rangeTxt:   { fontSize: 10, fontWeight: '600' },
});

// ─── Biomarker card ──────────────────────────────────────────────────────────

function BiomarkerCard({
  b, profile, onPress,
}: { b: Biomarker; profile: any; onPress: () => void }) {
  const cfg   = STATUS[b.status] ?? STATUS.optimal;
  const ref   = BIOMARKER_REFS[b.id];
  const prio  = biomarkerPriorityScore(b, profile);
  const Icon  = cfg.icon;

  return (
    <TouchableOpacity style={card.wrap} onPress={onPress} activeOpacity={0.8}>
      {/* Top row: name + status badge */}
      <View style={card.topRow}>
        <View style={card.left}>
          <Text style={card.name}>{b.name}</Text>
          <Text style={card.cat}>{b.category}</Text>
        </View>
        <View style={card.right}>
          <Text style={card.val}>{b.value}</Text>
          <Text style={card.unit}>{b.unit}</Text>
          <View style={[card.badge, { backgroundColor: cfg.bg }]}>
            <Icon color={cfg.color} size={11} />
            <Text style={[card.badgeTxt, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
      </View>

      {/* Range bar */}
      <RangeBar biomarker={b} />

      {/* Description + priority signal */}
      {ref?.description && (
        <Text style={card.desc} numberOfLines={2}>{ref.description}</Text>
      )}

      {/* Goal/symptom relevance chips */}
      {prio > 20 && (
        <View style={card.prioRow}>
          <View style={[card.prioBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[card.prioTxt, { color: cfg.color }]}>
              {prio >= 70 ? '🔴 High priority' : prio >= 40 ? '🟡 Watch closely' : '🟢 Monitor'}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const card = StyleSheet.create({
  wrap:     { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  topRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  left:     { flex: 1 },
  right:    { alignItems: 'flex-end', gap: 4 },
  name:     { fontSize: 15, fontWeight: '700', color: '#111827' },
  cat:      { fontSize: 11, color: '#9ca3af', textTransform: 'capitalize', marginTop: 1 },
  val:      { fontSize: 22, fontWeight: '800', color: '#111827', lineHeight: 24 },
  unit:     { fontSize: 11, color: '#6b7280', marginTop: -2 },
  badge:    { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginTop: 2 },
  badgeTxt: { fontSize: 11, fontWeight: '600' },
  desc:     { fontSize: 12, color: '#6b7280', marginTop: 8, lineHeight: 17 },
  prioRow:  { marginTop: 8 },
  prioBadge:{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  prioTxt:  { fontSize: 11, fontWeight: '600' },
});

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <View style={empty.wrap}>
      <FlaskConical color="#9ca3af" size={48} />
      <Text style={empty.title}>No lab results yet</Text>
      <Text style={empty.sub}>
        Complete onboarding with demo data or upload your bloodwork to see your biomarker analysis.
      </Text>
      <TouchableOpacity style={empty.btn} onPress={onReset} activeOpacity={0.85}>
        <Text style={empty.btnTxt}>Re-run onboarding</Text>
      </TouchableOpacity>
    </View>
  );
}

const empty = StyleSheet.create({
  wrap:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 48, gap: 12 },
  title:  { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center' },
  sub:    { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  btn:    { marginTop: 12, backgroundColor: '#9333ea', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function LabsScreen() {
  const router = useRouter();
  const { labPanel, intakeProfile, resetOnboarding } = useHealthStore();
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'priority' | 'status' | 'name'>('priority');

  const profile = intakeProfile;

  // Count by status
  const counts = useMemo(() => {
    if (!labPanel) return {};
    return Object.fromEntries(
      Object.keys(STATUS).map(k => [k, labPanel.biomarkers.filter(b => b.status === k).length])
    );
  }, [labPanel]);

  // Health score
  const score = useMemo(
    () => labPanel ? computeHealthScore(labPanel, profile) : 0,
    [labPanel, profile]
  );

  // Filtered + sorted biomarkers
  const biomarkers = useMemo(() => {
    if (!labPanel) return [];
    let list = labPanel.biomarkers;
    if (activeCategory !== 'all') list = list.filter(b => b.category === activeCategory);

    if (sortBy === 'priority') {
      list = [...list].sort(
        (a, b) => biomarkerPriorityScore(b, profile) - biomarkerPriorityScore(a, profile)
      );
    } else if (sortBy === 'status') {
      const order = { elevated: 0, low: 1, borderline: 2, optimal: 3 };
      list = [...list].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
    } else {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [labPanel, activeCategory, sortBy, profile]);

  if (!labPanel) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <Text style={s.title}>Lab Results</Text>
        </View>
        <EmptyState onReset={() => { resetOnboarding(); router.replace('/(onboarding)'); }} />
      </SafeAreaView>
    );
  }

  const notOptimal = labPanel.biomarkers.filter(b => b.status !== 'optimal').length;

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Lab Results</Text>
          <Text style={s.subtitle}>{labPanel.source} · {labPanel.date}</Text>
        </View>
        <View style={s.scoreBubble}>
          <Text style={s.scoreNum}>{score}</Text>
          <Text style={s.scoreLbl}>Score</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary pills */}
        <View style={s.summaryRow}>
          {Object.entries(STATUS).map(([key, cfg]) => (
            <TouchableOpacity
              key={key}
              style={[s.pill, { backgroundColor: cfg.bg }, activeCategory === key && s.pillActive]}
              onPress={() => setActiveCategory(activeCategory === key ? 'all' : key)}
            >
              <Text style={[s.pillNum, { color: cfg.color }]}>{counts[key] ?? 0}</Text>
              <Text style={[s.pillLbl, { color: cfg.color }]}>{cfg.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Needs attention callout */}
        {notOptimal > 0 && (
          <View style={s.attentionCard}>
            <AlertTriangle color="#d97706" size={16} />
            <Text style={s.attentionTxt}>
              {notOptimal} biomarker{notOptimal > 1 ? 's' : ''} need attention —
              {profile?.goals?.length ? ' prioritised by your goals' : ' sorted by severity'}
            </Text>
          </View>
        )}

        {/* Category filter tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.catScroll}
          contentContainerStyle={s.catRow}
        >
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c.key}
              style={[s.catChip, activeCategory === c.key && s.catChipActive]}
              onPress={() => setActiveCategory(c.key)}
            >
              <Text style={s.catEmoji}>{c.emoji}</Text>
              <Text style={[s.catLabel, activeCategory === c.key && s.catLabelActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sort row */}
        <View style={s.sortRow}>
          <Text style={s.sortLabel}>Sort:</Text>
          {(['priority', 'status', 'name'] as const).map(key => (
            <TouchableOpacity
              key={key}
              style={[s.sortBtn, sortBy === key && s.sortBtnActive]}
              onPress={() => setSortBy(key)}
            >
              <Text style={[s.sortBtnTxt, sortBy === key && s.sortBtnTxtActive]}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Biomarker cards */}
        <View style={s.cards}>
          {biomarkers.map(b => (
            <BiomarkerCard
              key={b.id}
              b={b}
              profile={profile}
              onPress={() => router.push('/(tabs)/coach')}
            />
          ))}
          {biomarkers.length === 0 && (
            <Text style={s.emptyFilter}>No biomarkers in this category.</Text>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const PURPLE = '#9333ea';

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f9fafb' },
  header:      { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:       { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle:    { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  scoreBubble: { width: 56, height: 56, borderRadius: 28, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  scoreNum:    { fontSize: 20, fontWeight: '900', color: '#fff', lineHeight: 22 },
  scoreLbl:    { fontSize: 9, color: '#e9d5ff', fontWeight: '600', letterSpacing: 0.5 },
  scroll:      { flex: 1, paddingHorizontal: 16 },
  summaryRow:  { flexDirection: 'row', gap: 8, paddingVertical: 14 },
  pill:        { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent' },
  pillActive:  { borderColor: PURPLE },
  pillNum:     { fontSize: 18, fontWeight: '800' },
  pillLbl:     { fontSize: 9, fontWeight: '700', marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.3 },
  attentionCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fffbeb', borderRadius: 10, padding: 12, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#f59e0b' },
  attentionTxt:  { fontSize: 13, color: '#92400e', flex: 1 },
  catScroll:   { marginBottom: 4 },
  catRow:      { gap: 8, paddingBottom: 8 },
  catChip:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  catChipActive:{ borderColor: PURPLE, backgroundColor: '#faf5ff' },
  catEmoji:    { fontSize: 13 },
  catLabel:    { fontSize: 12, fontWeight: '500', color: '#6b7280' },
  catLabelActive: { color: PURPLE, fontWeight: '600' },
  sortRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sortLabel:   { fontSize: 12, color: '#9ca3af', fontWeight: '600' },
  sortBtn:     { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  sortBtnActive: { borderColor: PURPLE, backgroundColor: '#faf5ff' },
  sortBtnTxt:  { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  sortBtnTxtActive: { color: PURPLE, fontWeight: '600' },
  cards:       { paddingBottom: 8 },
  emptyFilter: { textAlign: 'center', color: '#9ca3af', fontSize: 14, marginTop: 32 },
});
