import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  CheckCircle2, Circle, ChevronRight,
  FlaskConical, Zap, MessageCircle,
  Flame, Leaf, Dumbbell, Moon, Pill, Target,
} from 'lucide-react-native';
import { useHealthStore } from '../../lib/store';
import type { Action } from '../../lib/types';

const PURPLE = '#9333ea';

// ── Category config ───────────────────────────────────────────────────────────
const CAT_CFG: Record<string, {
  bg: string; text: string; border: string;
  icon: React.FC<any>; emoji: string;
}> = {
  Movement:   { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', icon: Flame,    emoji: '🏃' },
  Nutrition:  { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', icon: Leaf,     emoji: '🥗' },
  Exercise:   { bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc', icon: Dumbbell, emoji: '💪' },
  Sleep:      { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff', icon: Moon,     emoji: '🌙' },
  Supplement: { bg: '#fffbeb', text: '#b45309', border: '#fde68a', icon: Pill,     emoji: '💊' },
  Lifestyle:  { bg: '#fff1f2', text: '#be123c', border: '#fecdd3', icon: Target,   emoji: '🎯' },
};

const FILTER_TABS = ['All', 'Pending', 'Done'] as const;
type FilterTab = typeof FILTER_TABS[number];

// ── Action card ───────────────────────────────────────────────────────────────
function ActionCard({ action, onToggle, onAskCoach }: {
  action: Action;
  onToggle: () => void;
  onAskCoach: () => void;
}) {
  const cat = CAT_CFG[action.category] ?? CAT_CFG.Lifestyle;
  const CatIcon = cat.icon;

  return (
    <View style={[ac.card, action.completed && ac.cardDone, { borderLeftColor: cat.border, borderLeftWidth: 3 }]}>
      {/* Check + content row */}
      <TouchableOpacity style={ac.row} onPress={onToggle} activeOpacity={0.7}>
        <View style={[ac.checkWrap, { borderColor: action.completed ? '#16a34a' : '#d1d5db' }, action.completed && { backgroundColor: '#16a34a' }]}>
          {action.completed
            ? <CheckCircle2 color="#fff" size={18} />
            : <Circle color="#d1d5db" size={18} />
          }
        </View>

        <View style={ac.body}>
          {/* Category chip */}
          <View style={[ac.chip, { backgroundColor: cat.bg, borderColor: cat.border }]}>
            <Text style={ac.chipEmoji}>{cat.emoji}</Text>
            <Text style={[ac.chipTxt, { color: cat.text }]}>{action.category}</Text>
          </View>

          {/* Title */}
          <Text style={[ac.title, action.completed && ac.titleDone]} numberOfLines={2}>
            {action.title}
          </Text>

          {/* Description */}
          {!!action.description && (
            <Text style={[ac.desc, action.completed && ac.descDone]} numberOfLines={2}>
              {action.description}
            </Text>
          )}

          {/* Biomarker target tag */}
          {action.biomarkerTarget && (
            <View style={ac.targetRow}>
              <FlaskConical color="#9333ea" size={11} />
              <Text style={ac.targetTxt}>Targets: {action.biomarkerTarget}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Ask coach button */}
      {!action.completed && (
        <TouchableOpacity style={ac.coachRow} onPress={onAskCoach} activeOpacity={0.7}>
          <MessageCircle color={PURPLE} size={13} />
          <Text style={ac.coachTxt}>Ask coach about this</Text>
          <ChevronRight color={PURPLE} size={13} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ActionsScreen() {
  const router = useRouter();
  const { actions, toggleAction } = useHealthStore();
  const [filter, setFilter] = useState<FilterTab>('All');

  const doneCount    = useMemo(() => actions.filter(a => a.completed).length, [actions]);
  const pendingCount = useMemo(() => actions.filter(a => !a.completed).length, [actions]);
  const pct          = actions.length > 0 ? Math.round((doneCount / actions.length) * 100) : 0;

  // Filtered list
  const filtered = useMemo(() => {
    if (filter === 'Pending') return actions.filter(a => !a.completed);
    if (filter === 'Done')    return actions.filter(a => a.completed);
    return actions;
  }, [actions, filter]);

  // Group by category
  const grouped = useMemo(() => {
    const map: Record<string, Action[]> = {};
    filtered.forEach(a => {
      const cat = a.category ?? 'Lifestyle';
      if (!map[cat]) map[cat] = [];
      map[cat].push(a);
    });
    // Sort groups: pending-first categories before done-only
    return Object.entries(map).sort(([, aList], [, bList]) => {
      const aPending = aList.some(x => !x.completed) ? 0 : 1;
      const bPending = bList.some(x => !x.completed) ? 0 : 1;
      return aPending - bPending;
    });
  }, [filtered]);

  // Empty state
  if (actions.length === 0) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.empty}>
          <Zap color={PURPLE} size={52} />
          <Text style={s.emptyTitle}>No actions yet</Text>
          <Text style={s.emptyBody}>
            Complete onboarding with your lab results to get personalised recommendations.
          </Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/onboarding')}>
            <Text style={s.emptyBtnTxt}>Start Onboarding</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Actions</Text>
          <Text style={s.subtitle}>{doneCount} of {actions.length} complete</Text>
        </View>
        <View style={s.scoreBubble}>
          <Text style={s.scoreNum}>{pct}%</Text>
        </View>
      </View>

      {/* ── Progress bar ────────────────────────────────────────────────── */}
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${pct}%` as any }]} />
      </View>

      {/* ── Filter tabs ─────────────────────────────────────────────────── */}
      <View style={s.filterRow}>
        {FILTER_TABS.map(t => (
          <TouchableOpacity
            key={t}
            style={[s.filterBtn, filter === t && s.filterBtnActive]}
            onPress={() => setFilter(t)}
          >
            <Text style={[s.filterTxt, filter === t && s.filterTxtActive]}>
              {t}
              {t === 'Pending' && pendingCount > 0 && (
                <Text style={[s.filterBadge, filter === t && s.filterBadgeActive]}> {pendingCount}</Text>
              )}
              {t === 'Done' && doneCount > 0 && (
                <Text style={[s.filterBadge, filter === t && s.filterBadgeActive]}> {doneCount}</Text>
              )}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Grouped action list ──────────────────────────────────────────── */}
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {grouped.length === 0 && (
          <View style={s.noItems}>
            <Text style={s.noItemsTxt}>
              {filter === 'Pending' ? 'All caught up! 🎉' : 'Nothing here yet.'}
            </Text>
          </View>
        )}
        {grouped.map(([cat, catActions]) => {
          const cfg = CAT_CFG[cat] ?? CAT_CFG.Lifestyle;
          const CatIcon = cfg.icon;
          const catDone = catActions.filter(a => a.completed).length;
          return (
            <View key={cat} style={s.group}>
              {/* Group header */}
              <View style={[s.groupHeader, { backgroundColor: cfg.bg }]}>
                <CatIcon color={cfg.text} size={14} />
                <Text style={[s.groupTitle, { color: cfg.text }]}>{cat}</Text>
                <Text style={[s.groupCount, { color: cfg.text }]}>
                  {catDone}/{catActions.length}
                </Text>
              </View>
              {/* Cards */}
              {catActions.map(action => (
                <ActionCard
                  key={action.id}
                  action={action}
                  onToggle={() => toggleAction(action.id)}
                  onAskCoach={() => router.push('/(tabs)/coach')}
                />
              ))}
            </View>
          );
        })}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#f9fafb' },
  empty:            { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  emptyTitle:       { fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center' },
  emptyBody:        { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  emptyBtn:         { backgroundColor: PURPLE, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  emptyBtnTxt:      { color: '#fff', fontWeight: '600', fontSize: 15 },

  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  title:            { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle:         { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  scoreBubble:      { width: 50, height: 50, borderRadius: 25, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  scoreNum:         { fontSize: 15, fontWeight: '800', color: '#fff' },

  barTrack:         { height: 4, backgroundColor: '#e5e7eb' },
  barFill:          { height: 4, backgroundColor: PURPLE, borderRadius: 2 },

  filterRow:        { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  filterBtn:        { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  filterBtnActive:  { borderColor: PURPLE, backgroundColor: '#f3e8ff' },
  filterTxt:        { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  filterTxtActive:  { color: PURPLE },
  filterBadge:      { fontSize: 12, color: '#6b7280' },
  filterBadgeActive:{ color: PURPLE },

  scroll:           { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  noItems:          { padding: 32, alignItems: 'center' },
  noItemsTxt:       { fontSize: 15, color: '#9ca3af' },

  group:            { marginBottom: 16 },
  groupHeader:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, marginBottom: 6 },
  groupTitle:       { fontSize: 13, fontWeight: '700', flex: 1 },
  groupCount:       { fontSize: 12, fontWeight: '600' },
});

// ── Action card styles ────────────────────────────────────────────────────────
const ac = StyleSheet.create({
  card:       { backgroundColor: '#fff', borderRadius: 12, marginBottom: 8, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardDone:   { opacity: 0.7 },
  row:        { flexDirection: 'row', padding: 14, gap: 12, alignItems: 'flex-start' },
  checkWrap:  { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  body:       { flex: 1, gap: 4 },
  chip:       { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1, marginBottom: 2 },
  chipEmoji:  { fontSize: 11 },
  chipTxt:    { fontSize: 11, fontWeight: '600' },
  title:      { fontSize: 14, fontWeight: '700', color: '#1f2937', lineHeight: 19 },
  titleDone:  { color: '#9ca3af', textDecorationLine: 'line-through' },
  desc:       { fontSize: 12, color: '#6b7280', lineHeight: 17 },
  descDone:   { color: '#d1d5db' },
  targetRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  targetTxt:  { fontSize: 11, color: PURPLE, fontWeight: '500' },
  coachRow:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#f3f4f6', backgroundColor: '#faf5ff' },
  coachTxt:   { flex: 1, fontSize: 12, color: PURPLE, fontWeight: '600' },
});
