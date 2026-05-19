import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Dimensions,
} from 'react-native';
import { X, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react-native';
import { BIOMARKER_REFS } from './biomarkers';
import type { Biomarker } from './types';

const { width: W } = Dimensions.get('window');
const PURPLE = '#C96A2B';

const STATUS_CFG: Record<string, { color: string; bg: string; label: string; icon: React.FC<any> }> = {
  optimal:    { color: '#2D8A5E', bg: '#EAF5EF', label: 'Optimal',    icon: Minus         },
  borderline: { color: '#C07A1A', bg: '#FEF4DC', label: 'Borderline', icon: AlertTriangle },
  elevated:   { color: '#B83232', bg: '#FAEBEB', label: 'Elevated',   icon: TrendingUp    },
  low:        { color: '#2B65A8', bg: '#E3EDF8', label: 'Low',        icon: TrendingDown  },
};

const STATUS_MEANING: Record<string, string> = {
  optimal:    'Your level is in the optimal range. This is where you want to be — continue what you\'re doing.',
  borderline: 'Your level is approaching the edge of the optimal range. Worth monitoring and discussing with your doctor at your next visit.',
  elevated:   'Your level is above the optimal range. This is clinically meaningful and worth addressing — see what your coach recommends.',
  low:        'Your level is below the optimal range. This can contribute to symptoms and should be addressed — your coach can explain the options.',
};

function RangeBar({ b }: { b: Biomarker }) {
  const cfg = STATUS_CFG[b.status] ?? STATUS_CFG.optimal;
  const lo  = b.optimalMin * 0.4;
  const hi  = b.optimalMax * 1.6;
  const pct = Math.min(97, Math.max(3, ((b.value - lo) / (hi - lo)) * 100));
  return (
    <View style={rb.wrap}>
      <View style={rb.track}>
        <View
          style={[
            rb.optimalZone,
            {
              left:  `${((b.optimalMin - lo) / (hi - lo)) * 100}%`,
              right: `${100 - ((b.optimalMax - lo) / (hi - lo)) * 100}%`,
            } as any,
          ]}
        />
        <View style={[rb.dot, { left: `${pct}%`, backgroundColor: cfg.color } as any]} />
      </View>
      <View style={rb.labels}>
        <Text style={rb.edge}>{b.optimalMin}</Text>
        <Text style={[rb.range, { color: cfg.color }]}>
          Optimal {b.optimalMin}–{b.optimalMax} {b.unit}
        </Text>
        <Text style={rb.edge}>{b.optimalMax}</Text>
      </View>
    </View>
  );
}

const rb = StyleSheet.create({
  wrap:        { marginTop: 12, marginBottom: 4 },
  track:       { height: 8, backgroundColor: '#f3f4f6', borderRadius: 4, position: 'relative', overflow: 'visible' },
  optimalZone: { position: 'absolute', top: 0, bottom: 0, backgroundColor: '#bbf7d0', borderRadius: 4 },
  dot:         { position: 'absolute', width: 16, height: 16, borderRadius: 8, top: -4, marginLeft: -8, borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },
  labels:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  edge:        { fontSize: 11, color: '#9ca3af', fontWeight: '500' },
  range:       { fontSize: 11, fontWeight: '700' },
});

interface Props {
  biomarker:  Biomarker | null;
  onClose:    () => void;
  onAskCoach: (prompt: string) => void;
}

export default function BiomarkerDetailModal({ biomarker, onClose, onAskCoach }: Props) {
  if (!biomarker) return null;

  const b    = biomarker;
  const ref  = BIOMARKER_REFS[b.id];
  const cfg  = STATUS_CFG[b.status] ?? STATUS_CFG.optimal;
  const Icon = cfg.icon;

  const coachPrompt = `My ${ref?.name ?? b.name} is ${b.value} ${b.unit}, which is ${cfg.label.toLowerCase()}. Explain in plain English what this means for my health, what's driving it, and what the most evidence-based interventions are to improve it.`;

  return (
    <Modal
      visible={!!biomarker}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={s.sheet}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerText}>
            <Text style={s.name}>{ref?.name ?? b.name}</Text>
            <Text style={s.category}>{b.category}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
            <X color="#6b7280" size={20} />
          </TouchableOpacity>
        </View>

        <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Value + status */}
          <View style={s.valueRow}>
            <View>
              <Text style={s.value}>{b.value}</Text>
              <Text style={s.unit}>{b.unit}</Text>
            </View>
            <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
              <Icon color={cfg.color} size={14} />
              <Text style={[s.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>

          {/* Range bar */}
          <RangeBar b={b} />

          {/* What it means */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>What this means</Text>
            <Text style={s.body}>{STATUS_MEANING[b.status] ?? STATUS_MEANING.optimal}</Text>
          </View>

          {/* What it is */}
          {ref?.description && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>What is {ref.shortName ?? ref.name}?</Text>
              <Text style={s.body}>{ref.description}</Text>
            </View>
          )}

          {/* Why the range */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Optimal range</Text>
            <Text style={s.body}>
              {b.optimalMin}–{b.optimalMax} {b.unit}. This range reflects the functional optimum — not just the standard lab reference range — based on longevity and performance research.
            </Text>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>

        {/* Coach CTA */}
        <View style={s.footer}>
          <TouchableOpacity
            style={s.coachBtn}
            onPress={() => onAskCoach(coachPrompt)}
            activeOpacity={0.85}
          >
            <Text style={s.coachBtnTxt}>Ask your coach about this →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  sheet:       { flex: 1, backgroundColor: '#fff' },
  header:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 28, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  headerText:  { flex: 1, marginRight: 12 },
  name:        { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 3 },
  category:    { fontSize: 12, color: '#9ca3af', textTransform: 'capitalize' },
  closeBtn:    { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },

  scroll:      { flex: 1, paddingHorizontal: 24 },

  valueRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 24, paddingBottom: 8 },
  value:       { fontSize: 48, fontWeight: '800', color: '#111827', lineHeight: 52 },
  unit:        { fontSize: 14, color: '#6b7280', marginTop: -4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 24 },
  statusLabel: { fontSize: 15, fontWeight: '700' },

  section:      { marginTop: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  body:         { fontSize: 15, color: '#374151', lineHeight: 22 },

  footer:      { paddingHorizontal: 24, paddingVertical: 20, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  coachBtn:    { backgroundColor: PURPLE, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  coachBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
