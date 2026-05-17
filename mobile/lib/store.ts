import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MOCK_ACTIONS,
  buildLabPanel,
  generateActionsFromPanel,
  DEMO_LAB_VALUES,
} from './biomarkers';
import type { HealthAction, ChatMessage, LabPanel, WearableData, DailyLog, PatientProtocol, ProtocolStep } from './types';
import type { IntakeProfile } from './types';

// ── Config ────────────────────────────────────────────────────────────────────
const API_BASE = 'https://bp-beta-beta.vercel.app';

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
  previousLabPanel: LabPanel | null;   // last panel for delta tracking
  setLabPanel: (panel: LabPanel) => void;

  // Wearable data
  wearableData: WearableData | null;
  wearableProvider: string | null;
  wearableConnected: boolean;
  setWearableData: (data: WearableData) => void;
  syncWearable: () => Promise<void>;
  markWearableConnected: (provider: string) => void;

  // Actions
  actions: HealthAction[];
  toggleAction: (id: string) => void;
  refreshActions: () => void;

  // Streak
  streak: number;

  // Daily check-in
  lastCheckInDate: string | null;
  dailyLogs: DailyLog[];
  submitDailyLog: (log: DailyLog) => void;
  skipCheckIn: () => void;
  needsCheckIn: () => boolean;

  // Weekly summary
  lastWeeklySummaryDate: string | null;
  needsWeeklySummary: () => boolean;
  markWeeklySummaryShown: () => void;

  // Action feedback
  actionFeedback: Record<string, { rating: 'tired' | 'fine' | 'good'; date: string }>;
  submitActionFeedback: (actionId: string, rating: 'tired' | 'fine' | 'good') => void;

  // Chat
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  clearMessages: () => void;

  // Protocol
  patientProtocol: PatientProtocol | null;
  protocolSteps: ProtocolStep[];
  protocolLoading: boolean;
  fetchProtocol: () => Promise<void>;
  toggleProtocolStep: (stepId: string) => void;
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
        // Use uploaded panel if patient uploaded during onboarding, else demo
        const panel   = profile.parsedLabPanel ?? buildLabPanel(DEMO_LAB_VALUES, profile, 'Demo Data');
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

        // Schedule notifications with actual protocol actions
        import('./notifications').then(({ scheduleDailyNotifications }) => {
          scheduleDailyNotifications(actions, profile, 0).catch(() => {});
        });
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
      previousLabPanel: null,
      setLabPanel: (panel: LabPanel) => {
        // Annotate biomarkers with delta from previous panel
        const prev = get().labPanel;
        if (prev) {
          const prevMap = new Map(prev.biomarkers.map(b => [b.id, b]));
          panel = {
            ...panel,
            biomarkers: panel.biomarkers.map(b => {
              const prevB = prevMap.get(b.id);
              if (!prevB) return b;
              const delta = parseFloat((b.value - prevB.value).toFixed(2));
              const improved =
                (b.status === 'optimal' && prevB.status !== 'optimal') ||
                (b.optimalMin <= b.value && b.value <= b.optimalMax) ||
                (Math.abs(delta) > 0 && Math.abs(b.value - (b.optimalMin + b.optimalMax) / 2) < Math.abs(prevB.value - (b.optimalMin + b.optimalMax) / 2));
              return {
                ...b,
                previousValue: prevB.value,
                delta,
                deltaStatus: Math.abs(delta) < 0.5 ? 'stable' : improved ? 'improved' : 'worsened',
              };
            }),
          };
        }
        const { intakeProfile, streak } = get();
        const actions = generateActionsFromPanel(panel, intakeProfile ?? null);
        const completedIds = new Set(
          get().actions.filter(a => a.completed).map(a => a.id)
        );
        const updatedActions = actions.map(a => ({ ...a, completed: completedIds.has(a.id) }));
        set((state) => ({
          previousLabPanel: state.labPanel,
          labPanel: panel,
          actions: updatedActions,
        }));

        // Reschedule notifications with updated actions + 90-day lab reminder
        import('./notifications').then(({ scheduleDailyNotifications, scheduleLabUploadReminder }) => {
          scheduleDailyNotifications(updatedActions, intakeProfile ?? null, streak).catch(() => {});
          scheduleLabUploadReminder(panel.date).catch(() => {});
        });
      },

      // ── Wearable data ───────────────────────────────────────────────────
      wearableData: null,
      wearableProvider: null,
      wearableConnected: false,
      setWearableData: (data: WearableData) => set({ wearableData: data }),
      markWearableConnected: (provider: string) => set({ wearableProvider: provider, wearableConnected: true }),
      syncWearable: async () => {
        const { wearableProvider, patientId } = get();
        if (!wearableProvider || !patientId) return;
        try {
          const res = await fetch(`${API_BASE}/api/wearables/${wearableProvider}/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patientId }),
          });
          if (!res.ok) return;
          const data = await res.json();
          if (data.wearableData) set({ wearableData: data.wearableData });
        } catch {
          // Fail silently
        }
      },

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
        const actions = generateActionsFromPanel(labPanel, intakeProfile ?? null);
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

      // ── Streak ──────────────────────────────────────────────────────────
      streak: 0,

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
        const { actions, patientId, lastCheckInDate, streak } = get();
        const updatedActions = actions.map(a => ({
          ...a,
          completed: log.actionCompletions[a.id] ?? a.completed,
        }));

        // Streak: increment if checked in yesterday, else reset to 1
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const newStreak = lastCheckInDate === yesterdayStr ? streak + 1 : 1;

        set((state) => ({
          lastCheckInDate: today(),
          dailyLogs: [...state.dailyLogs.slice(-89), log],
          actions: updatedActions,
          streak: newStreak,
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

      // ── Weekly summary ──────────────────────────────────────────────────
      lastWeeklySummaryDate: null,

      needsWeeklySummary: () => {
        const { lastWeeklySummaryDate, hasCompletedOnboarding, dailyLogs } = get();
        if (!hasCompletedOnboarding) return false;
        if (dailyLogs.length < 3) return false; // need at least 3 days of data
        const dayOfWeek = new Date().getDay(); // 0 = Sunday
        if (dayOfWeek !== 0) return false; // only on Sundays
        return lastWeeklySummaryDate !== today();
      },

      markWeeklySummaryShown: () => set({ lastWeeklySummaryDate: today() }),

      actionFeedback: {},
      submitActionFeedback: (actionId, rating) =>
        set((state) => ({
          actionFeedback: { ...state.actionFeedback, [actionId]: { rating, date: today() } },
        })),

      // ── Chat ────────────────────────────────────────────────────────────
      messages: [],

      addMessage: (msg) =>
        set((state) => ({ messages: [...state.messages, msg] })),

      clearMessages: () => set({ messages: [] }),

      // ── Protocol ────────────────────────────────────────────────────────
      patientProtocol: null,
      protocolSteps: [],
      protocolLoading: false,

      fetchProtocol: async () => {
        const { patientId } = get();
        if (!patientId) return;
        set({ protocolLoading: true });
        try {
          const res = await fetch(`${API_BASE}/api/patient-protocols?patient_id=${patientId}`);
          if (!res.ok) { set({ protocolLoading: false }); return; }
          const data: PatientProtocol | null = await res.json();
          if (!data) { set({ patientProtocol: null, protocolSteps: [], protocolLoading: false }); return; }

          // Build steps: prefer personalized_actions, fall back to protocol_actions
          const raw = data.personalized_actions?.length
            ? data.personalized_actions.map((a, i) => ({
                id: a.id ?? `step-${i}`,
                title: a.title,
                description: a.description ?? '',
                mechanism: (a as any).why,
                category: a.category,
                timeOfDay: a.timeOfDay,
                biomarkerTargets: a.targetBiomarkers,
                sortOrder: i,
                completed: false,
              }))
            : (data.protocol?.protocol_actions ?? [])
                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                .map((a) => ({
                  id: a.id,
                  title: a.title,
                  description: a.description ?? '',
                  mechanism: a.mechanism,
                  category: a.category,
                  timeOfDay: a.time_of_day,
                  biomarkerTargets: a.biomarker_targets,
                  evidenceGrade: a.evidence_grade,
                  effectSize: a.effect_size,
                  timeToEffect: a.time_to_effect,
                  sortOrder: a.sort_order,
                  completed: false,
                }));

          // Preserve existing completion state
          const existing = new Set(get().protocolSteps.filter(s => s.completed).map(s => s.id));
          const steps: ProtocolStep[] = raw.map(s => ({ ...s, completed: existing.has(s.id) }));

          set({ patientProtocol: data, protocolSteps: steps, protocolLoading: false });
        } catch {
          set({ protocolLoading: false });
        }
      },

      toggleProtocolStep: (stepId: string) =>
        set((state) => ({
          protocolSteps: state.protocolSteps.map(s =>
            s.id === stepId ? { ...s, completed: !s.completed } : s
          ),
        })),
    }),
    {
      name: 'bioprecision-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        intakeProfile:          state.intakeProfile,
        labPanel:               state.labPanel,
        previousLabPanel:       state.previousLabPanel,
        wearableData:           state.wearableData,
        messages:               state.messages,
        actions:                state.actions,
        streak:                 state.streak,
        lastCheckInDate:        state.lastCheckInDate,
        dailyLogs:              state.dailyLogs,
        patientId:              state.patientId,
        deviceId:               state.deviceId,
        lastWeeklySummaryDate:  state.lastWeeklySummaryDate,
        wearableProvider:       state.wearableProvider,
        wearableConnected:      state.wearableConnected,
        patientProtocol:        state.patientProtocol,
        protocolSteps:          state.protocolSteps,
      }),
    }
  )
);

// Re-export for backward compatibility
export { MOCK_ACTIONS };
export { buildLabPanel, generateActionsFromPanel } from './biomarkers';
