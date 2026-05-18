import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, Modal, Pressable, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import {
  User, Flame, FlaskConical, Target, ChevronRight,
  LogOut, Upload, Shield, Heart, Edit3,
} from 'lucide-react-native';
import { useHealthStore } from '../../lib/store';
import { track, EVENTS } from '../../lib/analytics';

const ACCENT = '#C96A2B';

const GOAL_META: Record<string, { label: string }> = {
  longevity:       { label: 'Longevity'      },
  weight_loss:     { label: 'Weight Loss'    },
  energy:          { label: 'Energy'         },
  muscle_gain:     { label: 'Muscle Gain'    },
  heart_health:    { label: 'Heart Health'   },
  hormone_balance: { label: 'Hormones'       },
  mental_clarity:  { label: 'Mental Clarity' },
  sleep:           { label: 'Sleep'          },
};

const ALL_GOALS = Object.entries(GOAL_META).map(([key, meta]) => ({ key, ...meta }));

// ── Goal editor modal ─────────────────────────────────────────────────────────
function GoalEditor({
  visible, current, onSave, onClose,
}: {
  visible: boolean;
  current: string[];
  onSave: (goals: string[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(current);

  const toggle = (key: string) => {
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={ge.overlay} onPress={onClose}>
        <Pressable style={ge.sheet} onPress={e => e.stopPropagation()}>
          <View style={ge.handle} />
          <Text style={ge.title}>Edit Goals</Text>
          <View style={ge.grid}>
            {ALL_GOALS.map(g => {
              const active = selected.includes(g.key);
              return (
                <TouchableOpacity
                  key={g.key}
                  style={[ge.chip, active && ge.chipActive]}
                  onPress={() => toggle(g.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[ge.chipLabel, active && ge.chipLabelActive]}>{g.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={ge.saveBtn}
            onPress={() => { onSave(selected); onClose(); }}
          >
            <Text style={ge.saveTxt}>Save</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const ge = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingBottom: 40, paddingTop: 16 },
  handle:         { width: 36, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, marginBottom: 20, alignSelf: 'center' },
  title:          { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 16, fontFamily: 'DMSans_700Bold' },
  grid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  chip:           { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  chipActive:     { borderColor: ACCENT, backgroundColor: '#FEF0E6' },
chipLabel:      { fontSize: 13, fontWeight: '500', color: '#6b7280' },
  chipLabelActive:{ color: ACCENT, fontWeight: '600' },
  saveBtn:        { backgroundColor: ACCENT, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  saveTxt:        { color: '#fff', fontWeight: '700', fontSize: 16, fontFamily: 'DMSans_700Bold' },
});

// ── Section component ─────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={p.section}>
      <Text style={p.sectionTitle}>{title}</Text>
      <View style={p.card}>{children}</View>
    </View>
  );
}

function Row({
  icon: Icon, label, value, onPress, destructive = false,
}: {
  icon: React.FC<any>;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  const color = destructive ? '#B83232' : '#374151';
  return (
    <TouchableOpacity style={p.row} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}>
      <Icon color={destructive ? '#B83232' : ACCENT} size={18} />
      <Text style={[p.rowLabel, { color }]}>{label}</Text>
      {value && <Text style={p.rowValue}>{value}</Text>}
      {onPress && <ChevronRight color="#d1d5db" size={16} />}
    </TouchableOpacity>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const {
    intakeProfile, labPanel, actions, streak,
    resetOnboarding, setLabPanel,
  } = useHealthStore();
  const [goalEditorOpen, setGoalEditorOpen] = useState(false);

  React.useEffect(() => {
    track(EVENTS.PROFILE_VIEWED);
  }, []);

  const profile = intakeProfile;
  const firstName = profile?.name?.split(' ')[0] ?? 'User';
  const initials  = profile?.name
    ? profile.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const doneToday   = actions.filter(a => a.completed).length;
  const labDate     = labPanel?.date ?? null;
  const labSource   = labPanel?.source ?? null;

  const handleGoalSave = (goals: string[]) => {
    if (!profile) return;
    useHealthStore.setState({ intakeProfile: { ...profile, goals } });
  };

  const handleUploadLabs = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/csv', 'text/plain'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType ?? 'application/pdf',
      } as any);
      if (profile) {
        formData.append('profile', JSON.stringify(profile));
      }

      const res = await fetch('https://bp-beta-beta.vercel.app/api/parse-labs', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const { panel } = await res.json();
      if (panel) {
        setLabPanel(panel);
        track(EVENTS.LAB_UPLOADED, { source: panel.source });
        Alert.alert('Labs updated', 'Your new results have been processed and your protocol has been updated.');
      }
    } catch {
      Alert.alert('Upload failed', 'Please try again or contact support.');
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset account',
      'This will erase all your data and return you to onboarding. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetOnboarding();
            router.replace('/(onboarding)');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={p.container}>
      <GoalEditor
        visible={goalEditorOpen}
        current={profile?.goals ?? []}
        onSave={handleGoalSave}
        onClose={() => setGoalEditorOpen(false)}
      />

      <View style={p.header}>
        <Text style={p.headerTitle}>Profile</Text>
      </View>

      <ScrollView style={p.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Avatar + name ──────────────────────────────────────────────── */}
        <View style={p.avatarSection}>
          <View style={p.avatar}>
            <Text style={p.avatarText}>{initials}</Text>
          </View>
          <Text style={p.name}>{profile?.name ?? 'Your Profile'}</Text>
          {profile?.primaryFocus && (
            <Text style={p.focus}>
              {GOAL_META[profile.primaryFocus]?.label ?? profile.primaryFocus}
            </Text>
          )}
        </View>

        {/* ── Stats row ──────────────────────────────────────────────────── */}
        <View style={p.statsRow}>
          <View style={p.stat}>
            <Text style={[p.statNum, streak > 0 && { color: ACCENT }]}>{streak}</Text>
            <Text style={p.statLabel}>Day streak</Text>
          </View>
          <View style={p.statDivider} />
          <View style={p.stat}>
            <Text style={p.statNum}>{doneToday}/{actions.length}</Text>
            <Text style={p.statLabel}>Today</Text>
          </View>
          <View style={p.statDivider} />
          <View style={p.stat}>
            <Text style={p.statNum}>{labPanel?.biomarkers.length ?? 0}</Text>
            <Text style={p.statLabel}>Biomarkers</Text>
          </View>
        </View>

        {/* ── Goals ──────────────────────────────────────────────────────── */}
        <Section title="Goals">
          <View style={p.goalRow}>
            {(profile?.goals ?? []).map(g => {
              const meta = GOAL_META[g] ?? { label: g };
              return (
                <View key={g} style={p.goalChip}>
                  <Text style={p.goalLabel}>{meta.label}</Text>
                </View>
              );
            })}
            <TouchableOpacity style={p.editGoalsBtn} onPress={() => setGoalEditorOpen(true)}>
              <Edit3 color={ACCENT} size={13} />
              <Text style={p.editGoalsTxt}>Edit</Text>
            </TouchableOpacity>
          </View>
        </Section>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        {profile && (profile.age || profile.biologicalSex || profile.weightLbs) && (
          <Section title="Body">
            {profile.age && (
              <Row icon={User} label="Age" value={`${profile.age} years`} />
            )}
            {profile.biologicalSex && (
              <Row icon={User} label="Biological sex" value={profile.biologicalSex} />
            )}
            {profile.weightLbs && (
              <Row icon={User} label="Weight" value={`${profile.weightLbs} lbs`} />
            )}
            {(profile.heightFt || profile.heightIn) && (
              <Row icon={User} label="Height" value={`${profile.heightFt ?? 0}'${profile.heightIn ?? 0}"`} />
            )}
          </Section>
        )}

        {/* ── Habits ─────────────────────────────────────────────────────── */}
        {profile?.habits && (
          <Section title="Habits">
            {profile.habits.sleepHours && (
              <Row icon={Heart} label="Sleep" value={profile.habits.sleepHours} />
            )}
            {profile.habits.exerciseDaysPerWeek && (
              <Row icon={Heart} label="Exercise" value={profile.habits.exerciseDaysPerWeek} />
            )}
            {profile.habits.dietType && (
              <Row icon={Heart} label="Diet" value={profile.habits.dietType} />
            )}
            {profile.habits.stressLevel && (
              <Row icon={Heart} label="Stress" value={profile.habits.stressLevel} />
            )}
            {profile.habits.alcoholPerWeek && (
              <Row icon={Heart} label="Alcohol" value={profile.habits.alcoholPerWeek} />
            )}
          </Section>
        )}

        {/* ── Medications & supplements ───────────────────────────────────── */}
        {((profile?.medications?.length ?? 0) > 0 || (profile?.supplements?.length ?? 0) > 0) && (
          <Section title="Medications & Supplements">
            {(profile?.medications ?? []).filter(m => m !== 'None').map(m => (
              <Row key={m} icon={Shield} label={m} />
            ))}
            {(profile?.supplements ?? []).map(s => (
              <Row key={s} icon={Shield} label={s} />
            ))}
          </Section>
        )}

        {/* ── Lab results ────────────────────────────────────────────────── */}
        <Section title="Lab Results">
          {labDate ? (
            <Row
              icon={FlaskConical}
              label={labSource ?? 'Lab panel'}
              value={labDate}
            />
          ) : (
            <Row icon={FlaskConical} label="No labs uploaded yet" />
          )}
          <Row
            icon={Upload}
            label="Upload new labs"
            onPress={handleUploadLabs}
          />
        </Section>

        {/* ── Account ────────────────────────────────────────────────────── */}
        <Section title="Account">
          <Row
            icon={Target}
            label="Privacy Policy"
            onPress={() => Linking.openURL('https://bp-beta-beta.vercel.app/privacy')}
          />
          <Row
            icon={Target}
            label="Terms of Service"
            onPress={() => Linking.openURL('https://bp-beta-beta.vercel.app/terms')}
          />
          <Row
            icon={LogOut}
            label="Reset account"
            onPress={handleReset}
            destructive
          />
        </Section>

        <Text style={p.version}>BioPrecision v1.0</Text>
        <Text style={p.disclaimer}>
          BioPrecision provides general health information only. It is not a substitute for professional medical advice, diagnosis, or treatment.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const p = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#FDF7F0' },
  header:       { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  headerTitle:  { fontSize: 24, fontWeight: '700', color: '#111827', fontFamily: 'DMSans_700Bold' },
  scroll:       { flex: 1 },

  avatarSection:{ alignItems: 'center', paddingVertical: 28, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', marginBottom: 20 },
  avatar:       { width: 72, height: 72, borderRadius: 36, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText:   { fontSize: 26, fontWeight: '700', color: '#fff', fontFamily: 'DMSans_700Bold' },
  name:         { fontSize: 22, fontWeight: '700', color: '#111827', fontFamily: 'DMSans_700Bold', marginBottom: 4 },
  focus:        { fontSize: 14, color: '#9ca3af', fontFamily: 'DMSans_400Regular' },

  statsRow:     { flexDirection: 'row', backgroundColor: '#fff', marginBottom: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  stat:         { flex: 1, alignItems: 'center', gap: 2 },
  statNum:      { fontSize: 20, fontWeight: '700', color: '#111827', fontFamily: 'DMSans_700Bold' },
  statLabel:    { fontSize: 11, color: '#9ca3af', fontFamily: 'DMSans_400Regular' },
  statDivider:  { width: 1, backgroundColor: '#f3f4f6', marginVertical: 4 },

  section:      { marginHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, fontFamily: 'DMSans_700Bold' },
  card:         { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },

  row:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f3f4f6' },
  rowLabel:     { flex: 1, fontSize: 14, fontWeight: '500', fontFamily: 'DMSans_500Medium' },
  rowValue:     { fontSize: 13, color: '#9ca3af', fontFamily: 'DMSans_400Regular' },

  goalRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
  goalChip:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FEF0E6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  goalLabel:    { fontSize: 12, color: ACCENT, fontWeight: '600', fontFamily: 'DMSans_600SemiBold' },
  editGoalsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: ACCENT },
  editGoalsTxt: { fontSize: 12, color: ACCENT, fontWeight: '600', fontFamily: 'DMSans_600SemiBold' },

  version:      { textAlign: 'center', fontSize: 12, color: '#d1d5db', marginBottom: 8, fontFamily: 'DMSans_400Regular' },
  disclaimer:   { textAlign: 'center', fontSize: 11, color: '#d1d5db', lineHeight: 16, marginHorizontal: 32, fontFamily: 'DMSans_400Regular' },
});
