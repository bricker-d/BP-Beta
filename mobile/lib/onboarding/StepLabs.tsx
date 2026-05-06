import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import StepBase from './StepBase';
import type { StepProps } from './types';

type LabSource = 'upload' | 'demo' | 'skip';

const API_BASE = 'https://bp-beta-beta.vercel.app';

const LAB_PROVIDERS = [
  'Quest Diagnostics', 'LabCorp', 'Rupa Health',
  'Function Health', 'Ulta Lab Tests', 'Other',
];

export default function StepLabs({ step, totalSteps, profile, update, next, back }: StepProps) {
  const [selected,  setSelected]  = useState<LabSource | ''>(profile.labDataSource ?? '');
  const [provider,  setProvider]  = useState('Quest Diagnostics');
  const [loading,   setLoading]   = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploaded,  setUploaded]  = useState(false);

  async function pickAndUpload() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/csv',
               'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setSelected('upload');
      setLoading(true);
      setUploadMsg('Uploading...');

      const formData = new FormData();
      // @ts-ignore — React Native FormData accepts this shape
      formData.append('file', {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? 'application/pdf',
      });
      formData.append('source', provider);
      if (profile.patientId) formData.append('patientId', profile.patientId);

      setUploadMsg('AI extracting biomarkers...');

      const res = await fetch(`${API_BASE}/api/parse-labs`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error(`Parse failed: ${res.status}`);

      const { panel } = await res.json();

      if (!panel?.biomarkers?.length) {
        throw new Error('No biomarkers found in this file');
      }

      // Store panel in profile for StepSummary to use
      update({
        labDataSource: 'upload',
        parsedLabPanel: panel,
      });

      setUploaded(true);
      setUploadMsg(`✓ ${panel.biomarkers.length} biomarkers extracted from ${asset.name}`);
      setLoading(false);

    } catch (err: unknown) {
      setLoading(false);
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setUploadMsg('');
      Alert.alert('Upload failed', `${msg}\n\nTry a different file or use demo data.`);
    }
  }

  async function handleNext() {
    if (!selected) return;

    if (selected === 'demo') {
      setLoading(true);
      await new Promise(r => setTimeout(r, 600));
      update({ labDataSource: 'demo' });
      setLoading(false);
      next();
      return;
    }

    if (selected === 'skip') {
      update({ labDataSource: 'skip' });
      next();
      return;
    }

    // upload — only proceed if file was actually uploaded
    if (!uploaded) {
      Alert.alert('Upload your labs first', 'Tap "Choose lab file" to upload your PDF or CSV.');
      return;
    }

    next();
  }

  const ctaLabel = loading ? uploadMsg || 'Working...'
    : uploaded ? `Continue (${(profile as {parsedLabPanel?: {biomarkers?: unknown[]}}).parsedLabPanel?.biomarkers?.length ?? 0} biomarkers) →`
    : 'Continue';

  return (
    <StepBase
      step={step}
      totalSteps={totalSteps}
      title="Your lab results"
      subtitle="BioPrecision is most powerful when it can see your bloodwork. Upload a PDF from Quest, LabCorp, Rupa Health, or any lab."
      onBack={back}
      ctaLabel={ctaLabel}
      onCta={handleNext}
      ctaDisabled={!selected || loading}
    >
      {/* Upload option */}
      <TouchableOpacity
        style={[s.card, selected === 'upload' && s.cardActive]}
        onPress={pickAndUpload}
        activeOpacity={0.8}
        disabled={loading}
      >
        <View style={s.cardLeft}>
          <Text style={s.cardEmoji}>📋</Text>
        </View>
        <View style={s.cardBody}>
          <Text style={[s.cardTitle, selected === 'upload' && s.cardTitleActive]}>
            {uploaded ? '✓ Lab file uploaded' : 'Upload my labs'}
          </Text>
          <Text style={s.cardSub}>
            {uploadMsg || 'PDF, CSV, or Excel from any lab provider'}
          </Text>
          {loading && selected === 'upload' && (
            <View style={s.loadingRow}>
              <ActivityIndicator size="small" color="#C96A2B" />
              <Text style={s.loadingTxt}>{uploadMsg}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Provider selector (shown when upload selected) */}
      {selected === 'upload' && !uploaded && (
        <View style={s.providerSection}>
          <Text style={s.providerLabel}>Lab provider</Text>
          <View style={s.providerRow}>
            {LAB_PROVIDERS.map(p => (
              <TouchableOpacity
                key={p}
                style={[s.providerChip, provider === p && s.providerChipActive]}
                onPress={() => setProvider(p)}
              >
                <Text style={[s.providerChipTxt, provider === p && s.providerChipTxtActive]}>
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Demo option */}
      <TouchableOpacity
        style={[s.card, selected === 'demo' && s.cardActive]}
        onPress={() => { setSelected('demo'); setUploaded(false); setUploadMsg(''); }}
        activeOpacity={0.8}
      >
        <View style={s.cardLeft}>
          <Text style={s.cardEmoji}>🔬</Text>
        </View>
        <View style={s.cardBody}>
          <Text style={[s.cardTitle, selected === 'demo' && s.cardTitleActive]}>Use demo data</Text>
          <Text style={s.cardSub}>See the full experience with realistic sample results</Text>
        </View>
      </TouchableOpacity>

      {/* Skip option */}
      <TouchableOpacity
        style={[s.card, selected === 'skip' && s.cardActive]}
        onPress={() => { setSelected('skip'); setUploaded(false); setUploadMsg(''); }}
        activeOpacity={0.8}
      >
        <View style={s.cardLeft}>
          <Text style={s.cardEmoji}>⏭️</Text>
        </View>
        <View style={s.cardBody}>
          <Text style={[s.cardTitle, selected === 'skip' && s.cardTitleActive]}>Skip for now</Text>
          <Text style={s.cardSub}>Add labs later from the Labs tab</Text>
        </View>
      </TouchableOpacity>

      <Text style={s.notice}>
        Your medical data is encrypted and never shared. You control your data.
      </Text>
    </StepBase>
  );
}

const PURPLE = '#C96A2B';

const s = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderRadius: 14, borderWidth: 1.5, borderColor: '#e5e7eb',
    backgroundColor: '#fff', marginBottom: 12, gap: 12,
  },
  cardActive: { borderColor: PURPLE, backgroundColor: '#FDF7F0' },
  cardLeft: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  cardEmoji: { fontSize: 20 },
  cardBody: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  cardTitleActive: { color: PURPLE },
  cardSub: { fontSize: 12, color: '#6b7280', lineHeight: 17 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  loadingTxt: { fontSize: 12, color: PURPLE },
  providerSection: { marginBottom: 12, marginTop: -4 },
  providerLabel: {
    fontSize: 11, fontWeight: '600', color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8,
  },
  providerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  providerChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff',
  },
  providerChipActive: { borderColor: PURPLE, backgroundColor: '#FDF7F0' },
  providerChipTxt: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  providerChipTxtActive: { color: PURPLE, fontWeight: '600' },
  notice: {
    fontSize: 11, color: '#9ca3af', textAlign: 'center',
    marginTop: 8, lineHeight: 16,
  },
});
