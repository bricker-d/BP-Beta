import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MOCK_PANEL } from '../../lib/biomarkers';

const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  optimal:    { color: '#16a34a', bg: '#dcfce7', label: 'Optimal' },
  borderline: { color: '#d97706', bg: '#fef3c7', label: 'Borderline' },
  elevated:   { color: '#dc2626', bg: '#fee2e2', label: 'Elevated' },
  low:        { color: '#2563eb', bg: '#dbeafe', label: 'Low' },
};

export default function LabsScreen() {
  const panel = MOCK_PANEL;
  const counts = Object.fromEntries(
    Object.keys(STATUS_CFG).map((k) => [k, panel.biomarkers.filter((b) => b.status === k).length])
  );

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Lab Results</Text>
        <Text style={s.subtitle}>{panel.source} · {panel.date}</Text>
      </View>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Summary pills */}
        <View style={s.summaryRow}>
          {Object.entries(STATUS_CFG).map(([key, cfg]) => (
            <View key={key} style={[s.pill, { backgroundColor: cfg.bg }]}>
              <Text style={[s.pillNum, { color: cfg.color }]}>{counts[key]}</Text>
              <Text style={[s.pillLbl, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          ))}
        </View>

        {/* Biomarker cards */}
        {panel.biomarkers.map((b) => {
          const cfg = STATUS_CFG[b.status] ?? STATUS_CFG.optimal;
          const range = b.optimalMax * 1.5 - b.optimalMin * 0.5;
          const pct = Math.min(95, Math.max(5, ((b.value - b.optimalMin * 0.5) / range) * 100));
          return (
            <View key={b.id} style={s.card}>
              <View style={s.cardTop}>
                <View style={s.cardLeft}>
                  <Text style={s.bioName}>{b.name}</Text>
                  <Text style={s.bioCat}>{b.category}</Text>
                </View>
                <View style={s.cardRight}>
                  <Text style={s.bioVal}>{b.value} <Text style={s.bioUnit}>{b.unit}</Text></Text>
                  <View style={[s.badge, { backgroundColor: cfg.bg }]}>
                    <Text style={[s.badgeTxt, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>
              </View>
              {/* Range bar */}
              <View style={s.barWrap}>
                <View style={s.barTrack}>
                  <View style={[s.barOptimal, { left: '25%', right: '25%' }]} />
                  <View style={[s.barDot, { left: `${pct}%` as any, backgroundColor: cfg.color }]} />
                </View>
              </View>
              <Text style={s.rangeLabel}>Optimal: {b.optimalMin}–{b.optimalMax} {b.unit}</Text>
            </View>
          );
        })}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  scroll: { flex: 1, paddingHorizontal: 16 },
  summaryRow: { flexDirection: 'row', gap: 8, paddingVertical: 14 },
  pill: { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center' },
  pillNum: { fontSize: 22, fontWeight: '800' },
  pillLbl: { fontSize: 9, fontWeight: '700', marginTop: 1, textTransform: 'uppercase' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cardLeft: { flex: 1 },
  bioName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  bioCat: { fontSize: 12, color: '#9ca3af', marginTop: 2, textTransform: 'capitalize' },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  bioVal: { fontSize: 16, fontWeight: '700', color: '#111827' },
  bioUnit: { fontSize: 12, fontWeight: '400', color: '#6b7280' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  badgeTxt: { fontSize: 11, fontWeight: '600' },
  barWrap: { marginBottom: 4 },
  barTrack: { height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'visible', position: 'relative' },
  barOptimal: { position: 'absolute', top: 0, bottom: 0, backgroundColor: '#bbf7d0', borderRadius: 3 },
  barDot: { position: 'absolute', width: 12, height: 12, borderRadius: 6, top: -3, marginLeft: -6, borderWidth: 2, borderColor: '#fff' },
  rangeLabel: { fontSize: 11, color: '#9ca3af' },
});
