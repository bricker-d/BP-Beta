import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { IntakeProfile } from '../types';

const API_URL = 'https://bp-beta-9fdp-git-main-dan-brickers-projects.vercel.app/api/chat';

interface Props {
  profile: Partial<IntakeProfile>;
  onFinish: (summaryMsg: string) => void;
}

// SSE streaming helper (same pattern as coach.tsx)
async function streamSummary(
  profile: Partial<IntakeProfile>,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (msg: string) => void,
) {
  const primaryFocus = profile.primaryFocus ?? profile.goals?.[0] ?? 'overall health';
  const habitContext = profile.habits
    ? `Sleep: ${profile.habits.sleepHours || 'unknown'}, Exercise: ${profile.habits.exerciseDaysPerWeek || 'unknown'}/week, Stress: ${profile.habits.stressLevel || 'unknown'}`
    : '';
  const symptomsStr = profile.symptoms?.length ? profile.symptoms.join(', ') : 'none reported';

  const systemPrompt = `You are BioPrecision — a precision health AI coach completing a patient intake.
The patient just finished onboarding. Write a personal, clinically-grounded welcome (3-4 sentences) that:
1. Addresses them by first name
2. Names their PRIMARY focus (${primaryFocus}) and one specific biomarker cluster it connects to
3. References ONE specific habit from their baseline (${habitContext}) and why it's relevant
4. Ends with what their first actions will target

Be direct and clinical, not generic. Sound like a knowledgeable doctor who has reviewed their profile, not a chatbot.
Do NOT say "welcome to the app", "I'm here to help", or other filler phrases.
Aim for 3-4 sentences total.`;

  const userMsg = `My intake profile: ${JSON.stringify(profile, null, 2)}`;

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: userMsg }],
        systemOverride: systemPrompt,
        labPanel: null,
        wearableData: null,
        intakeProfile: profile,
      }),
    });

    if (!res.ok || !res.body) { onError('Failed to generate summary.'); return; }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') { onDone(); return; }
        try {
          const parsed = JSON.parse(payload);
          const chunk =
            parsed?.choices?.[0]?.delta?.content ??
            parsed?.content?.[0]?.text ?? '';
          if (chunk) onChunk(chunk);
        } catch { /* skip */ }
      }
    }
    onDone();
  } catch {
    onError('Connection error. Using a default welcome instead.');
  }
}

export default function StepSummary({ profile, onFinish }: Props) {
  const [summary, setSummary] = useState('');
  const [streaming, setStreaming] = useState(true);
  const [error, setError] = useState('');
  const accumulated = useRef('');

  const firstName = profile.name?.split(' ')[0] ?? 'there';

  useEffect(() => {
    accumulated.current = '';
    setStreaming(true);
    setError('');
    setSummary('');

    streamSummary(
      profile,
      (chunk) => {
        accumulated.current += chunk;
        setSummary(accumulated.current);
      },
      () => setStreaming(false),
      (msg) => {
        setError(msg);
        setStreaming(false);
        // Fallback message
        const fallback = `Hi ${firstName}! I've reviewed your profile and I'm ready to help you reach your health goals. Let's get started — your personalised plan is waiting in the app.`;
        setSummary(fallback);
        accumulated.current = fallback;
      },
    );
  }, []);

  function handleContinue() {
    onFinish(accumulated.current || summary);
  }

  const ITEMS = [
    profile.primaryFocus ? { label: 'Primary focus', value: profile.primaryFocus.replace(/_/g, ' ') } : null,
    profile.biologicalSex ? { label: 'Sex / Age', value: `${profile.biologicalSex}${profile.age ? ', ' + profile.age + ' yrs' : ''}` } : null,
    profile.habits?.sleepHours ? { label: 'Sleep', value: profile.habits.sleepHours } : null,
    profile.habits?.exerciseDaysPerWeek ? { label: 'Exercise', value: profile.habits.exerciseDaysPerWeek + '/week' } : null,
    profile.habits?.stressLevel ? { label: 'Stress', value: profile.habits.stressLevel } : null,
    profile.symptoms?.length ? { label: 'Symptoms', value: profile.symptoms.slice(0, 3).join(', ') + (profile.symptoms.length > 3 ? ' +' + (profile.symptoms.length - 3) + ' more' : '') } : null,
    profile.labDataSource ? { label: 'Labs', value: profile.labDataSource } : null,
    profile.wearableSource && profile.wearableSource !== 'none'
      ? { label: 'Wearable', value: profile.wearableSource }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.headerBox}>
          <Text style={s.emoji}>✨</Text>
          <Text style={s.title}>You're all set, {firstName}!</Text>
          <Text style={s.subtitle}>Here's a quick summary of what we know about you.</Text>
        </View>

        {/* Profile snapshot */}
        {ITEMS.length > 0 && (
          <View style={s.card}>
            {ITEMS.map((item, i) => (
              <View key={i} style={[s.row, i < ITEMS.length - 1 && s.rowDivider]}>
                <Text style={s.rowLabel}>{item.label}</Text>
                <Text style={s.rowValue} numberOfLines={2}>{item.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* AI welcome message */}
        <View style={s.aiCard}>
          <View style={s.aiHeader}>
            <View style={s.aiBadge}>
              <Text style={s.aiBadgeTxt}>AI Coach</Text>
            </View>
            {streaming && <ActivityIndicator size="small" color="#9333ea" />}
          </View>
          {summary ? (
            <Text style={s.aiMsg}>{summary}{streaming ? '▍' : ''}</Text>
          ) : (
            <View style={s.thinking}>
              <ActivityIndicator size="small" color="#9333ea" />
              <Text style={s.thinkingTxt}>Personalising your welcome…</Text>
            </View>
          )}
          {error ? <Text style={s.errorTxt}>{error}</Text> : null}
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.cta, (streaming && !summary) && s.ctaOff]}
          onPress={handleContinue}
          disabled={streaming && !summary}
          activeOpacity={0.85}
        >
          <Text style={s.ctaTxt}>
            {streaming ? 'Go to Dashboard' : 'Start my journey →'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const PURPLE = '#9333ea';

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 32, paddingBottom: 24 },

  headerBox: { alignItems: 'center', marginBottom: 28 },
  emoji: { fontSize: 40, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },

  card: {
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  rowLabel: { fontSize: 13, fontWeight: '600', color: '#6b7280', flexShrink: 0 },
  rowValue: { fontSize: 13, color: '#111827', textAlign: 'right', flex: 1 },

  aiCard: {
    backgroundColor: '#faf5ff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e9d5ff',
    padding: 16,
    marginBottom: 8,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  aiBadge: {
    backgroundColor: PURPLE,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  aiBadgeTxt: { fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  aiMsg: { fontSize: 15, color: '#111827', lineHeight: 22 },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  thinkingTxt: { fontSize: 14, color: PURPLE },
  errorTxt: { fontSize: 12, color: '#ef4444', marginTop: 6 },

  footer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  cta: {
    backgroundColor: PURPLE,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaOff: { opacity: 0.6 },
  ctaTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
