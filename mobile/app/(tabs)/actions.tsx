import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2, Circle } from 'lucide-react-native';
import { useHealthStore } from '../../lib/store';

const CAT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Movement:   { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  Nutrition:  { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  Exercise:   { bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc' },
  Sleep:      { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' },
  Supplement: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
};

export default function ActionsScreen() {
  const { actions, toggleAction } = useHealthStore();
  const done = actions.filter((a) => a.completed).length;
  const pct = Math.round((done / actions.length) * 100);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Actions</Text>
        <Text style={s.counter}>{done}/{actions.length} done</Text>
      </View>

      {/* Progress bar */}
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${pct}%` as any }]} />
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {actions.map((action) => {
          const col = CAT_COLORS[action.category] ?? CAT_COLORS.Movement;
          return (
            <TouchableOpacity
              key={action.id}
              style={[s.card, action.completed && s.cardDone]}
              onPress={() => toggleAction(action.id)}
              activeOpacity={0.7}
            >
              <View style={s.checkCol}>
                {action.completed
                  ? <CheckCircle2 color="#9333ea" size={24} />
                  : <Circle color="#d1d5db" size={24} />}
              </View>
              <View style={s.body}>
                <View style={s.topRow}>
                  <Text style={[s.cardTitle, action.completed && s.strikethrough]} numberOfLines={2}>
                    {action.title}
                  </Text>
                  <View style={[s.catBadge, { backgroundColor: col.bg, borderColor: col.border }]}>
                    <Text style={[s.catTxt, { color: col.text }]}>{action.category}</Text>
                  </View>
                </View>
                <Text style={s.desc} numberOfLines={2}>{action.description}</Text>
                <Text style={s.why} numberOfLines={2}>💡 {action.why}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  counter: { fontSize: 14, color: '#9333ea', fontWeight: '700' },
  barTrack: { height: 3, backgroundColor: '#f3f4f6' },
  barFill: { height: 3, backgroundColor: '#9333ea' },
  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 5, elevation: 1 },
  cardDone: { opacity: 0.55 },
  checkCol: { paddingTop: 2 },
  body: { flex: 1, gap: 4 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827', lineHeight: 20 },
  strikethrough: { textDecorationLine: 'line-through', color: '#9ca3af' },
  desc: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  why: { fontSize: 12, color: '#9ca3af', lineHeight: 17 },
  catBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, borderWidth: 1 },
  catTxt: { fontSize: 10, fontWeight: '700' },
});
