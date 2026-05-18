import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../supabase';

interface Props {
  onAuthenticated: () => void;
}

export default function StepAuth({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError('');

    if (mode === 'signup') {
      const { error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (signUpErr) { setLoading(false); setError(signUpErr.message); return; }

      // signUp may not establish a session if email confirmation is enabled.
      // Sign in immediately to guarantee a live session before proceeding.
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInErr) {
        setLoading(false);
        setError('Account created — please check your email to confirm, then sign in.');
        setMode('signin');
        return;
      }
    } else {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) { setLoading(false); setError(authError.message); return; }
    }

    setLoading(false);
    onAuthenticated();
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.header}>
            <View style={s.logoBox}>
              <Text style={s.logoMark}>BP</Text>
            </View>
            <Text style={s.title}>
              {mode === 'signup' ? 'Create your account' : 'Welcome back'}
            </Text>
            <Text style={s.subtitle}>
              {mode === 'signup'
                ? 'Your data is encrypted and never sold.'
                : 'Sign in to continue your protocol.'}
            </Text>
          </View>

          <View style={s.form}>
            <View style={s.field}>
              <Text style={s.label}>Email</Text>
              <TextInput
                style={s.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
              />
            </View>
            <View style={s.field}>
              <Text style={s.label}>Password</Text>
              <TextInput
                style={s.input}
                value={password}
                onChangeText={setPassword}
                placeholder={mode === 'signup' ? 'Minimum 8 characters' : 'Your password'}
                placeholderTextColor="#9ca3af"
                secureTextEntry
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </View>

            {error ? <Text style={s.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[s.btn, (!email.trim() || !password || loading) && s.btnOff]}
              onPress={handleSubmit}
              disabled={!email.trim() || !password || loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnTxt}>{mode === 'signup' ? 'Create account' : 'Sign in'}</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={s.toggle}
              onPress={() => { setMode(m => m === 'signup' ? 'signin' : 'signup'); setError(''); }}
            >
              <Text style={s.toggleTxt}>
                {mode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const BRAND = '#C96A2B';

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#fff' },
  flex:    { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32 },

  header:  { marginBottom: 40 },
  logoBox: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: BRAND,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  logoMark: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  title:    { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6b7280', lineHeight: 22 },

  form:  { gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#111827', backgroundColor: '#fafafa',
  },

  error:  { fontSize: 13, color: '#ef4444', marginTop: -4 },

  btn: {
    backgroundColor: BRAND, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  btnOff:  { opacity: 0.4 },
  btnTxt:  { fontSize: 16, fontWeight: '700', color: '#fff' },

  toggle:    { alignItems: 'center', paddingVertical: 12 },
  toggleTxt: { fontSize: 14, color: BRAND, fontWeight: '500' },
});
