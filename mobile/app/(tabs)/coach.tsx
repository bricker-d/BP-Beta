import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView,
  Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Send, FlaskConical, Zap, ChevronRight,
  MessageCircle, RotateCcw, AlertTriangle,
} from 'lucide-react-native';
import { useHealthStore } from '../../lib/store';
import { BIOMARKER_REFS } from '../../lib/biomarkers';
import type { ChatMessage } from '../../lib/types';

const API_URL = 'https://bp-beta-9fdp-git-main-dan-brickers-projects.vercel.app/api/chat';
const PURPLE  = '#9333ea';

// ── SSE streaming helper ──────────────────────────────────────────────────────
async function streamChat(
  messages:      { role: string; content: string }[],
  labPanel:      object | null,
  wearableData:  object | null,
  intakeProfile: object | null,
  onChunk: (text: string) => void,
  onDone:  () => void,
  onError: (msg: string) => void
) {
  try {
    const res = await fetch(API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, labPanel, wearableData, intakeProfile }),
    });

    if (!res.ok || !res.body) {
      onError('Server error. Please try again.');
      return;
    }

    const reader  = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer    = '';

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
          const chunk  = parsed?.text ?? parsed?.choices?.[0]?.delta?.content ?? '';
          if (chunk) onChunk(chunk);
        } catch {
          // malformed JSON line — skip
        }
      }
    }
    onDone();
  } catch {
    onError('Connection error. Is the API deployed?');
  }
}

// ── Generate dynamic starter prompts from real data ───────────────────────────
function buildStarterPrompts(
  labPanel:      ReturnType<typeof useHealthStore>['labPanel'],
  intakeProfile: ReturnType<typeof useHealthStore>['intakeProfile']
): { label: string; prompt: string; icon: string }[] {
  const prompts: { label: string; prompt: string; icon: string }[] = [];

  // From out-of-range biomarkers (highest impact first)
  if (labPanel) {
    const flagged = labPanel.biomarkers
      .filter(b => b.status !== 'optimal')
      .slice(0, 3);

    for (const b of flagged) {
      const ref  = BIOMARKER_REFS[b.id];
      const name = ref?.name ?? b.id;
      const status = b.status;

      if (status === 'elevated') {
        prompts.push({
          icon: '🔴',
          label: `Why is my ${name} elevated?`,
          prompt: `My ${name} is ${b.value} ${b.unit}, which is elevated. Can you explain what's driving this, how it connects to my goals, and what the most evidence-based interventions are to bring it down?`,
        });
      } else if (status === 'low') {
        prompts.push({
          icon: '🔵',
          label: `My ${name} is low — what should I do?`,
          prompt: `My ${name} is ${b.value} ${b.unit}, which is below optimal. What does this mean for my health and what are the best ways to address it?`,
        });
      } else if (status === 'borderline') {
        prompts.push({
          icon: '🟡',
          label: `${name} is borderline — should I worry?`,
          prompt: `My ${name} is ${b.value} ${b.unit}, which is borderline. What's the clinical significance of this, and what can I do now before it becomes a real problem?`,
        });
      }
    }
  }

  // From goals
  const goals = intakeProfile?.goals ?? [];
  if (goals.includes('longevity') && prompts.length < 4) {
    prompts.push({
      icon: '⏳',
      label: 'What are my biggest longevity risks?',
      prompt: 'Based on my lab results and profile, what are the most significant risks to my longevity right now, and what are the highest-leverage interventions I should prioritize?',
    });
  }
  if (goals.includes('weight_loss') && prompts.length < 4) {
    prompts.push({
      icon: '⚖️',
      label: 'What does my data say about fat loss?',
      prompt: 'Looking at my biomarkers and profile, what does my metabolic picture look like for fat loss? What are the root causes and what should I focus on first?',
    });
  }
  if (goals.includes('energy') && prompts.length < 4) {
    prompts.push({
      icon: '⚡',
      label: 'Why might I have low energy?',
      prompt: 'Based on my labs and profile, what biomarkers or patterns might be contributing to low energy, and what are the most impactful things I can do about it?',
    });
  }
  if (goals.includes('muscle_gain') && prompts.length < 4) {
    prompts.push({
      icon: '💪',
      label: 'What does my data say about building muscle?',
      prompt: 'What do my hormone levels, nutrient markers, and overall labs suggest about my capacity to build muscle? What should I optimize first?',
    });
  }
  if (goals.includes('heart_health') && prompts.length < 4) {
    prompts.push({
      icon: '❤️',
      label: 'What is my cardiovascular risk?',
      prompt: 'Based on my lipid panel and other markers, what does my cardiovascular risk picture look like? What are the most important things to address?',
    });
  }
  if (goals.includes('hormone_balance') && prompts.length < 4) {
    prompts.push({
      icon: '🔄',
      label: 'How are my hormones looking?',
      prompt: 'Can you give me a full picture of my hormonal health based on my labs? What patterns do you see and what are the most effective ways to optimize them?',
    });
  }

  // Always include a general summary option
  if (!labPanel) {
    prompts.push({
      icon: '🔬',
      label: 'What should I test first?',
      prompt: 'I haven\'t uploaded my labs yet. Based on my goals and symptoms, what biomarkers are most important for me to get tested first, and where can I order them?',
    });
  } else {
    prompts.push({
      icon: '📊',
      label: 'Give me my full health summary',
      prompt: 'Give me a comprehensive summary of my health based on all my lab results. Start with the most critical findings, identify any patterns across markers, and give me a prioritized action plan.',
    });
  }

  return prompts.slice(0, 4);
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ message, streaming }: { message: ChatMessage; streaming: boolean }) {
  const isUser = message.role === 'user';

  return (
    <View style={[mb.wrap, isUser ? mb.wrapUser : mb.wrapAssistant]}>
      {!isUser && (
        <View style={mb.avatar}>
          <Text style={mb.avatarTxt}>AI</Text>
        </View>
      )}
      <View style={[mb.bubble, isUser ? mb.bubbleUser : mb.bubbleAssistant]}>
        <Text style={[mb.txt, isUser ? mb.txtUser : mb.txtAssistant]}>
          {message.content}
          {streaming && !isUser && (
            <Text style={mb.cursor}>▊</Text>
          )}
        </Text>
      </View>
    </View>
  );
}

// ── Starter prompt card ───────────────────────────────────────────────────────
function StarterCard({ item, onPress }: {
  item: { label: string; prompt: string; icon: string };
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={sc.card} onPress={onPress} activeOpacity={0.75}>
      <Text style={sc.icon}>{item.icon}</Text>
      <Text style={sc.label} numberOfLines={2}>{item.label}</Text>
      <ChevronRight color={PURPLE} size={14} />
    </TouchableOpacity>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CoachScreen() {
  const {
    messages, addMessage, clearMessages,
    labPanel, intakeProfile, wearableData,
  } = useHealthStore();

  const [input,     setInput]     = useState('');
  const [streaming, setStreaming] = useState(false);
  const listRef = useRef<FlatList>(null);
  const streamingIdRef = useRef<string | null>(null);

  const firstName    = intakeProfile?.name?.split(' ')[0] ?? null;
  const hasMessages  = messages.length > 0;

  // Dynamic starter prompts built from real data
  const starterPrompts = useMemo(
    () => buildStarterPrompts(labPanel, intakeProfile),
    [labPanel, intakeProfile]
  );

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || streaming) return;

    setInput('');

    const userMsg: ChatMessage = {
      id:        `u_${Date.now()}`,
      role:      'user',
      content:   text,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMsg);

    // Build message history for API
    const snapshot = [...messages, userMsg].map(m => ({
      role:    m.role,
      content: m.content,
    }));

    // Placeholder assistant message
    const assistantId = `a_${Date.now()}`;
    streamingIdRef.current = assistantId;

    const placeholder: ChatMessage = {
      id:        assistantId,
      role:      'assistant',
      content:   '',
      timestamp: new Date().toISOString(),
    };
    addMessage(placeholder);
    setStreaming(true);

    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);

    let accumulated = '';

    await streamChat(
      snapshot,
      labPanel,
      wearableData ?? null,
      intakeProfile ?? null,
      // onChunk
      (chunk) => {
        accumulated += chunk;
        useHealthStore.setState(state => ({
          messages: state.messages.map(m =>
            m.id === assistantId ? { ...m, content: accumulated } : m
          ),
        }));
        listRef.current?.scrollToEnd({ animated: false });
      },
      // onDone
      () => {
        setStreaming(false);
        streamingIdRef.current = null;
        listRef.current?.scrollToEnd({ animated: true });
      },
      // onError
      (msg) => {
        setStreaming(false);
        streamingIdRef.current = null;
        useHealthStore.setState(state => ({
          messages: state.messages.map(m =>
            m.id === assistantId
              ? { ...m, content: `⚠️ ${msg}` }
              : m
          ),
        }));
      }
    );
  }, [input, streaming, messages, labPanel, wearableData, intakeProfile, addMessage]);

  // ── Empty / starter state ─────────────────────────────────────────────────
  const renderEmpty = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={s.emptyContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={s.heroWrap}>
        <View style={s.heroAvatar}>
          <Text style={s.heroAvatarTxt}>AI</Text>
        </View>
        <Text style={s.heroTitle}>
          {firstName ? `Hey ${firstName}, I'm your` : 'Your'}
        </Text>
        <Text style={s.heroSubtitle}>BioPrecision Coach</Text>
        <Text style={s.heroBody}>
          {labPanel
            ? `I have your lab results and profile loaded. Ask me anything about your biomarkers, what they mean, or what to do about them.`
            : `Connect your lab results in onboarding for fully personalized insights. For now, ask me anything about health optimization.`}
        </Text>
      </View>

      {/* Lab status banner */}
      {!labPanel && (
        <View style={s.nolabBanner}>
          <AlertTriangle color="#d97706" size={14} />
          <Text style={s.nolabTxt}>No lab data — responses will be general, not personalized</Text>
        </View>
      )}

      {/* Starter prompts */}
      <Text style={s.starterTitle}>
        {labPanel ? 'Based on your labs, try asking:' : 'Get started:'}
      </Text>
      <View style={s.starterGrid}>
        {starterPrompts.map((item, i) => (
          <StarterCard
            key={i}
            item={item}
            onPress={() => handleSend(item.prompt)}
          />
        ))}
      </View>
    </ScrollView>
  );

  // ── Message list ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.headerAvatar}>
            <Text style={s.headerAvatarTxt}>AI</Text>
          </View>
          <View>
            <Text style={s.headerTitle}>Health Coach</Text>
            <Text style={s.headerSub}>
              {firstName ? `Personalized for ${firstName}` : 'Powered by Claude'}
            </Text>
          </View>
        </View>
        <View style={s.headerRight}>
          {streaming && (
            <View style={s.thinkingBadge}>
              <ActivityIndicator size="small" color={PURPLE} />
              <Text style={s.thinkingTxt}>Thinking</Text>
            </View>
          )}
          {hasMessages && !streaming && (
            <TouchableOpacity onPress={clearMessages} style={s.clearBtn}>
              <RotateCcw color="#9ca3af" size={16} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Messages or empty state */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {!hasMessages ? (
          renderEmpty()
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={m => m.id}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                streaming={streaming && item.id === streamingIdRef.current}
              />
            )}
          />
        )}

        {/* Suggest follow-ups after responses */}
        {hasMessages && !streaming && starterPrompts.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chipRow}
          >
            {starterPrompts.slice(0, 3).map((item, i) => (
              <TouchableOpacity
                key={i}
                style={s.chip}
                onPress={() => handleSend(item.prompt)}
                activeOpacity={0.7}
              >
                <Text style={s.chipEmoji}>{item.icon}</Text>
                <Text style={s.chipTxt} numberOfLines={1}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Input bar */}
        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about your labs, symptoms, or goals..."
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={() => handleSend()}
            editable={!streaming}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || streaming) && s.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={!input.trim() || streaming}
            activeOpacity={0.8}
          >
            {streaming
              ? <ActivityIndicator size="small" color="#fff" />
              : <Send color="#fff" size={18} />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#f9fafb' },

  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  headerLeft:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar:    { width: 36, height: 36, borderRadius: 18, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  headerAvatarTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
  headerTitle:     { fontSize: 15, fontWeight: '700', color: '#111827' },
  headerSub:       { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  headerRight:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thinkingBadge:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f3e8ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  thinkingTxt:     { fontSize: 12, color: PURPLE, fontWeight: '600' },
  clearBtn:        { padding: 6 },

  // Empty state
  emptyContainer:  { padding: 24, paddingBottom: 40 },
  heroWrap:        { alignItems: 'center', paddingVertical: 24 },
  heroAvatar:      { width: 64, height: 64, borderRadius: 32, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroAvatarTxt:   { color: '#fff', fontWeight: '900', fontSize: 20 },
  heroTitle:       { fontSize: 18, color: '#6b7280', fontWeight: '400' },
  heroSubtitle:    { fontSize: 26, fontWeight: '800', color: '#111827', marginTop: 2, marginBottom: 12 },
  heroBody:        { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 21, maxWidth: 300 },

  nolabBanner:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 10, padding: 12, marginBottom: 20 },
  nolabTxt:        { fontSize: 12, color: '#92400e', flex: 1 },

  starterTitle:    { fontSize: 13, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  starterGrid:     { gap: 10 },

  // Message list
  listContent:     { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },

  // Suggestion chips
  chipRow:         { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip:            { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f3e8ff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, maxWidth: 220 },
  chipEmoji:       { fontSize: 13 },
  chipTxt:         { fontSize: 12, color: PURPLE, fontWeight: '600' },

  // Input bar
  inputBar:        { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  input:           { flex: 1, backgroundColor: '#f9fafb', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#1f2937', borderWidth: 1.5, borderColor: '#e5e7eb', maxHeight: 100 },
  sendBtn:         { width: 42, height: 42, borderRadius: 21, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#d1d5db' },
});

// ── Message bubble styles ─────────────────────────────────────────────────────
const mb = StyleSheet.create({
  wrap:           { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-end' },
  wrapUser:       { justifyContent: 'flex-end' },
  wrapAssistant:  { justifyContent: 'flex-start', gap: 8 },
  avatar:         { width: 28, height: 28, borderRadius: 14, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:      { color: '#fff', fontWeight: '800', fontSize: 10 },
  bubble:         { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser:     { backgroundColor: PURPLE, borderBottomRightRadius: 4 },
  bubbleAssistant:{ backgroundColor: '#fff', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  txt:            { fontSize: 14, lineHeight: 21 },
  txtUser:        { color: '#fff' },
  txtAssistant:   { color: '#1f2937' },
  cursor:         { color: PURPLE },
});

// ── Starter card styles ───────────────────────────────────────────────────────
const sc = StyleSheet.create({
  card:  { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: '#e5e7eb', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  icon:  { fontSize: 18 },
  label: { flex: 1, fontSize: 13, fontWeight: '600', color: '#374151', lineHeight: 18 },
});
