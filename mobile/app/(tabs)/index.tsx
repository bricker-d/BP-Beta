import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Activity, TrendingUp, AlertCircle, CheckSquare, MessageCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { MOCK_PANEL } from '../../lib/biomarkers';
import { useHealthStore } from '../../lib/store';

const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  optimal: { color: '#16a34a', bg: '#dcfce7', label: 'Optimal' },
  borderline: { color: '#d97706', bg: '#fef3c7', label: 'Borderline' },
  elevated: { color: '#dc2626', bg: '#fee2e2', label: 'Elevated' },
  low: { color: '#2563eb', bg: '#dbeafe', label: 'Low' },
};

export default function HomeScreen() {
  const router = useRouter();
  const { actions } = useHealthStore();
  const panel = MOCK_PANEL;
  const completed = actions.filter((a) => a.completed).length;
  const optimalCount = panel.biomarkers.filter((b) => b.status === 'optimal').length;
  const score = Math.round((optimalCount / panel.biomarkers.length) * 100);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Good morning 👋</Text>
            <Text style={s.name}>Dan</Text>
          </View>
          <TouchableOpacity style={s.coachBtn} onPress={() => router.push('/(tabs)/coach')}>
            <MessageCircle color="#9333ea" size={18} />
            <Text style={s.coachBtnText}>Ask Coach</Text>
          </TouchableOpacity>
        </View>

        {/* Score Card */}
        <View style={s.scoreCard}>
          <View style={s.scoreRow}>
            <Activity color="#c4b5fd" size={18} />
            <Text style={s.scoreLabel}>Health Score</Text>
          </View>
          <View style={s.scoreNumRow}>
            <Text style={s.scoreNum}>{score}</Text>
            <Text style={s.scoreMax}>/100</Text>
          </View>
          <View style={s.scoreMeta}>
            <Text style={s.scoreMetaTxt}>{optimalCount}/{panel.biomarkers.length} biomarkers optimal</Text>
            <Text style={s.scoreDateTxt}>Updated {panel.date}</Text>
          </View>
        </View>

        {/* Actions Progress */}
        <TouchableOpacity style={s.actionsCard} onPress={() => router.push('/(tabs)/actions')}>
          <CheckSquare color="#9333ea" size={18} />
          <Text style={s.actionsTxt}>{completed}/{actions.length} actions completed today</Text>
          <View style={s.barTrack}>
            <View style={[s.barFill, { width: `${Math.round((completed / actions.length) * 100)}%` as any }]} />
          </View>
        </TouchableOpacity>

        {/* Biomarkers */}
        <Text style={s.sectionTitle}>Biomarkers</Text>
        {panel.biomarkers.slice(0, 5).map((b) => {
          const cfg = STATUS_CFG[b.status] ?? STATUS_CFG.optimal;
          return (
            <TouchableOpacity key={b.id} style={s.bioRow} onPress={() => router.push('/(tabs)/labs')}>
              <AlertCircle color={cfg.color} size={16} />
              <View style={s.bioInfo}>
                <Text style={s.bioName}>{b.name}</Text>
                <Text style={s.bioVal}>{b.value} {b.unit}</Text>
              </View>
              <View style={[s.badge, { backgroundColor: cfg.bg }]}>
                <Text style={[s.badgeTxt, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={s.viewAll} onPress={() => router.push('/(tabs)/labs')}>
          <Text style={s.viewAllTxt}>View all {panel.biomarkers.length} biomarkers →</Text>
        </TouchableOpacity>
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20 },
  greeting: { fontSize: 13, color: '#6b7280' },
  name: { fontSize: 26, fontWeight: '800', color: '#111827' },
  coachBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#faf5ff', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#e9d5ff' },
  coachBtnText: { fontSize: 13, fontWeight: '600', color: '#9333ea' },
  scoreCard: { backgroundColor: '#9333ea', borderRadius: 20, padding: 20, marginBottom: 12 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  scoreLabel: { fontSize: 13, fontWeight: '600', color: '#e9d5ff' },
  scoreNumRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginBottom: 8 },
  scoreNum: { fontSize: 64, fontWeight: '900', color: '#fff', lineHeight: 70 },
  scoreMax: { fontSize: 18, color: '#c4b5fd', fontWeight: '600' },
  scoreMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  scoreMetaTxt: { fontSize: 13, color: '#e9d5ff' },
  scoreDateTxt: { fontSize: 12, color: '#c4b5fd' },
  actionsCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 20, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  actionsTxt: { flex: 1, fontSize: 14, fontWeight: '500', color: '#374151' },
  barTrack: { width: '100%', height: 4, backgroundColor: '#f3f4f6', borderRadius: 2 },
  barFill: { height: 4, backgroundColor: '#9333ea', borderRadius: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 },
  bioRow: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  bioInfo: { flex: 1 },
  bioName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  bioVal: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeTxt: { fontSize: 11, fontWeight: '600' },
  viewAll: { alignItems: 'center', paddingVertical: 12 },
  viewAllTxt: { fontSize: 14, color: '#9333ea', fontWeight: '600' },
});
