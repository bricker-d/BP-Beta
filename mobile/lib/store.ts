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
  coachPrimePrompt: string | null;
  setCoachPrimePrompt: (prompt: string | null) => void;

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

      coachPrimePrompt: null,
      setCoachPrimePrompt: (prompt) => set({ coachPrimePrompt: prompt }),

      // ── Protocol ────────────────────────────────────────────────────────
      patientProtocol: null,
      protocolSteps: [],
      protocolLoading: false,

      fetchProtocol: async () => {
        set({ protocolLoading: true });
        try {
          const { supabase } = await import('./supabase');
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) { set({ protocolLoading: false }); return; }

          // Fetch active user_protocol with joined protocol
          const { data: up } = await supabase
            .from('user_protocols')
            .select('*, protocol:protocols_v2(id, name, description, duration_days)')
            .eq('user_id', session.user.id)
            .eq('status', 'active')
            .maybeSingle();

          if (!up) {
            set({ patientProtocol: null, protocolSteps: [], protocolLoading: false });
            return;
          }

          // Fetch steps for day 1 (daily repeating actions)
          const { data: rawSteps } = await supabase
            .from('protocol_steps')
            .select('*')
            .eq('protocol_id', up.protocol_id)
            .eq('day_number', 1)
            .order('sort_order', { ascending: true });

          // Load today's completion state from Supabase (authoritative source)
          const { data: completions } = await supabase
            .from('step_completions')
            .select('step_id')
            .eq('user_id', session.user.id)
            .eq('completed_on', today());

          const completedIds = new Set((completions ?? []).map(c => c.step_id));

          const steps: ProtocolStep[] = (rawSteps ?? []).map(s => ({
            id:               s.id,
            title:            s.title,
            description:      s.description ?? '',
            mechanism:        s.evidence_summary ?? '',
            category:         'Lifestyle' as const,
            timeOfDay:        'morning' as const,
            biomarkerTargets: [],
            completed:        completedIds.has(s.id),
          }));

          const proto = up.protocol as { id: string; name: string; description: string | null; duration_days: number | null };

          set({
            patientProtocol: {
              patient_id:           session.user.id,
              protocol_id:          up.protocol_id,
              personalized_actions: null,
              protocol: {
                id:               proto.id,
                name:             proto.name,
                description:      proto.description ?? undefined,
                protocol_actions: [],
              },
            } as PatientProtocol,
            protocolSteps:   steps,
            protocolLoading: false,
          });
        } catch {
          set({ protocolLoading: false });
        }
      },

      toggleProtocolStep: (stepId: string) => {
        const currentStep = get().protocolSteps.find(s => s.id === stepId);
        const nowCompleted = !currentStep?.completed;

        // Optimistic local update
        set((state) => ({
          protocolSteps: state.protocolSteps.map(s =>
            s.id === stepId ? { ...s, completed: nowCompleted } : s
          ),
        }));

        // Persist to Supabase in background — consistent JWT pattern
        (async () => {
          try {
            const { supabase } = await import('./supabase');
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const todayDate = today();
            if (nowCompleted) {
              await supabase
                .from('step_completions')
                .upsert(
                  { user_id: session.user.id, step_id: stepId, completed_on: todayDate },
                  { onConflict: 'user_id,step_id,completed_on' }
                );
            } else {
              await supabase
                .from('step_completions')
                .delete()
                .eq('user_id', session.user.id)
                .eq('step_id', stepId)
                .eq('completed_on', todayDate);
            }
          } catch { /* fail silently — local state is already updated */ }
        })();
      },
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
