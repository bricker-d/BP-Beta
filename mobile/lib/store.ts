import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MOCK_ACTIONS,
  buildLabPanel,
  generateActionsFromPanel,
  DEMO_LAB_VALUES,
} from './biomarkers';
import type { HealthAction, ChatMessage, LabPanel, WearableData, DailyLog } from './types';
import type { IntakeProfile } from './types';

// ── Config ────────────────────────────────────────────────────────────────────
const API_BASE = 'https://bp-beta-9fdp-git-main-dan-brickers-projects.vercel.app';

// ── Store interface ───────────────────────────────────────────────────────────
interface HealthStore {
  // Onboarding
  hasCompletedOnboarding: boolean;
  intakeProfile: IntakeProfile | null;
  completeOnboarding: (profile: IntakeProfile, summaryMsg: string) => void;
  resetOnboarding: () => void;

  // Supabase patient ID (set after first sync)
  patientId: string | null;
  deviceId: string | null;
  syncPatient: () => Promise<void>;

  // Lab panel
  labPanel: LabPanel | null;
  setLabPanel: (panel: LabPanel) => void;

  // Wearable data
  wearableData: WearableData | null;
  setWearableData: (data: WearableData) => void;

  // Actions
  actions: HealthAction[];
  toggleAction: (id: string) => void;
  refreshActions: () => void;

  // Daily check-in
  lastCheckInDate: string | null;
  dailyLogs: DailyLog[];
  submitDailyLog: (log: DailyLog) => void;
  skipCheckIn: () => void;
  needsCheckIn: () => boolean;

  // Chat
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  clearMessages: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function today(): string {
  return new Date().toISOString().split('T')[0];
}

function generateDeviceId(): string {
  return 'bp_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── Store ─────────────────────────────────────────────────────────────────────
export const useHealthStore = create<HealthStore>()(
  persist(
    (set, get) => ({
      // ── Onboarding ──────────────────────────────────────────────────────
      hasCompletedOnboarding: false,
      intakeProfile: null,
      patientId: null,
      deviceId: null,

      completeOnboarding: (profile: IntakeProfile, summaryMsg: string) => {
        const panel   = buildLabPanel(DEMO_LAB_VALUES, profile);
        const actions = generateActionsFromPanel(panel, profile);

        const welcomeMsg: ChatMessage = {
          id:        'welcome',
          role:      'assistant',
          content:   summaryMsg || 'Welcome! I\'ve analysed your profile. Ask me anything about your health.',
          timestamp: new Date().toISOString(),
        };

        // Generate device ID if not already set
        const deviceId = get().deviceId ?? generateDeviceId();

        set({
          hasCompletedOnboarding: true,
          intakeProfile: profile,
          labPanel: panel,
          actions,
          messages: [welcomeMsg],
          lastCheckInDate: today(),
          deviceId,
        });

        // Sync to Supabase in background
        get().syncPatient().catch(() => {});
      },

      resetOnboarding: () => set({
        hasCompletedOnboarding: false,
        intakeProfile: null,
        labPanel: null,
        wearableData: null,
        actions: [],
        messages: [],
        lastCheckInDate: null,
        dailyLogs: [],
        patientId: null,
      }),

      // ── Supabase sync ───────────────────────────────────────────────────
      syncPatient: async () => {
        const { deviceId, intakeProfile } = get();
        if (!deviceId || !intakeProfile) return;

        try {
          const res = await fetch(`${API_BASE}/api/patient`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId, profile: intakeProfile }),
          });

          if (!res.ok) return;
          const { patientId } = await res.json();
          if (patientId) set({ patientId });
        } catch {
          // Fail silently — app works offline
        }
      },

      // ── Lab panel ───────────────────────────────────────────────────────
      labPanel: null,
      setLabPanel: (panel: LabPanel) => {
        const { intakeProfile } = get();
        const actions = generateActionsFromPanel(panel, intakeProfile ?? undefined);
        const completedIds = new Set(
          get().actions.filter(a => a.completed).map(a => a.id)
        );
        set({
          labPanel: panel,
          actions: actions.map(a => ({ ...a, completed: completedIds.has(a.id) })),
        });
      },

      // ── Wearable data ───────────────────────────────────────────────────
      wearableData: null,
      setWearableData: (data: WearableData) => set({ wearableData: data }),

      // ── Actions ─────────────────────────────────────────────────────────
      actions: [],

      toggleAction: (id: string) =>
        set((state) => ({
          actions: state.actions.map(a =>
            a.id === id ? { ...a, completed: !a.completed } : a
          ),
        })),

      refreshActions: () => {
        const { labPanel, intakeProfile } = get();
        if (!labPanel) return;
        const actions = generateActionsFromPanel(labPanel, intakeProfile ?? undefined);
        const completedIds = new Set(
          get().actions.filter(a => a.completed).map(a => a.id)
        );
        set({
          actions: actions.map(a => ({
            ...a,
            completed: completedIds.has(a.id),
          })),
        });
      },

      // ── Daily check-in ──────────────────────────────────────────────────
      lastCheckInDate: null,
      dailyLogs: [],

      needsCheckIn: () => {
        const { lastCheckInDate, hasCompletedOnboarding, actions } = get();
        if (!hasCompletedOnboarding) return false;
        if (!actions.length) return false;
        return lastCheckInDate !== today();
      },

      submitDailyLog: (log: DailyLog) => {
        const { actions, patientId } = get();
        const updatedActions = actions.map(a => ({
          ...a,
          completed: log.actionCompletions[a.id] ?? a.completed,
        }));

        set((state) => ({
          lastCheckInDate: today(),
          dailyLogs: [...state.dailyLogs.slice(-89), log],
          actions: updatedActions,
        }));

        // Persist to Supabase in background
        if (patientId) {
          fetch(`${API_BASE}/api/daily-log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patientId, log }),
          }).catch(() => {});
        }
      },

      skipCheckIn: () => set({ lastCheckInDate: today() }),

      // ── Chat ────────────────────────────────────────────────────────────
      messages: [],

      addMessage: (msg) =>
        set((state) => ({ messages: [...state.messages, msg] })),

      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'bioprecision-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        intakeProfile:          state.intakeProfile,
        labPanel:               state.labPanel,
        wearableData:           state.wearableData,
        messages:               state.messages,
        actions:                state.actions,
        lastCheckInDate:        state.lastCheckInDate,
        dailyLogs:              state.dailyLogs,
        patientId:              state.patientId,
        deviceId:               state.deviceId,
      }),
    }
  )
);

// Re-export for backward compatibility
export { MOCK_ACTIONS };
export { buildLabPanel, generateActionsFromPanel } from './biomarkers';
