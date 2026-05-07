import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <View style={s.container}>
          <Text style={s.title}>Something went wrong</Text>
          <Text style={s.body}>{this.state.error?.message ?? 'An unexpected error occurred.'}</Text>
          <TouchableOpacity
            style={s.btn}
            onPress={() => this.setState({ hasError: false, error: undefined })}
          >
            <Text style={s.btnTxt}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#FDF7F0' },
  title:     { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8, textAlign: 'center' },
  body:      { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  btn:       { backgroundColor: '#C96A2B', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  btnTxt:    { color: '#fff', fontWeight: '600', fontSize: 15 },
});
