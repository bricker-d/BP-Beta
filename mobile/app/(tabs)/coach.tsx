import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send } from 'lucide-react-native';
import { useHealthStore } from '../../lib/store';
import type { ChatMessage } from '../../lib/types';

const API_URL = 'https://bp-beta-9fdp-git-main-dan-brickers-projects.vercel.app/api/chat';

export default function CoachScreen() {
  const { messages, addMessage } = useHealthStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input.trim(), timestamp: new Date().toISOString() };
    addMessage(userMsg);
    const snapshot = [...messages, userMsg];
    setInput('');
    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: snapshot.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      const reply = data?.content?.[0]?.text ?? data?.message ?? data?.reply ?? 'Something went wrong.';
      addMessage({ id: (Date.now() + 1).toString(), role: 'assistant', content: reply, timestamp: new Date().toISOString() });
    } catch {
      addMessage({ id: (Date.now() + 1).toString(), role: 'assistant', content: 'Connection error. Is the Vercel app deployed?', timestamp: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <View style={s.avatar}><Text style={s.avatarTxt}>AI</Text></View>
        <View>
          <Text style={s.title}>Health Coach</Text>
          <Text style={s.subtitle}>Powered by Claude</Text>
        </View>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={s.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View style={[s.bubble, item.role === 'user' ? s.userBubble : s.aiBubble]}>
              <Text style={[s.bubbleTxt, item.role === 'user' ? s.userTxt : s.aiTxt]}>{item.content}</Text>
            </View>
          )}
          ListFooterComponent={loading ? (
            <View style={s.typing}>
              <ActivityIndicator size="small" color="#9333ea" />
              <Text style={s.typingTxt}>Coach is thinking...</Text>
            </View>
          ) : null}
        />
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about your health..."
            placeholderTextColor="#9ca3af"
            multiline
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnOff]}
            onPress={send}
            disabled={!input.trim() || loading}
          >
            <Send color="#fff" size={16} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#9333ea', alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  title: { fontSize: 16, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 12, color: '#9ca3af' },
  list: { padding: 16, gap: 10 },
  bubble: { maxWidth: '82%', borderRadius: 18, padding: 12, paddingHorizontal: 14 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#9333ea', borderBottomRightRadius: 4 },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  bubbleTxt: { fontSize: 15, lineHeight: 22 },
  userTxt: { color: '#fff' },
  aiTxt: { color: '#111827' },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, paddingLeft: 16 },
  typingTxt: { fontSize: 13, color: '#9ca3af' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, gap: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  input: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#111827', maxHeight: 100 },
  sendBtn: { backgroundColor: '#9333ea', borderRadius: 22, width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { backgroundColor: '#e9d5ff' },
});
