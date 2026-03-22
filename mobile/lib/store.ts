import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MOCK_ACTIONS,
  buildLabPanel,
  generateActionsFromPanel,
  DEMO_LAB_VALUES,
} from './biomarkers';
import type { HealthAction, ChatMessage, LabPanel, WearableData } from './types';
import type { IntakeProfile } from './types';

// ── Store interface ───────────────────────────────────────────────────────────
interface HealthStore {
  // Onboarding
  hasCompletedOnboarding: boolean;
  intakeProfile: IntakeProfile | null;
  completeOnboarding: (profile: IntakeProfile, summaryMsg: string) => void;
  resetOnboarding: () => void;

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

  // Chat
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  clearMessages: () => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────
export const useHealthStore = create<HealthStore>()(
  persist(
    (set, get) => ({
      // ── Onboarding ──────────────────────────────────────────────────────
      hasCompletedOnboarding: false,
      intakeProfile: null,

      completeOnboarding: (profile: IntakeProfile, summaryMsg: string) => {
        // Build lab panel immediately using demo values + intake profile
        const panel   = buildLabPanel(DEMO_LAB_VALUES, profile);
        const actions = generateActionsFromPanel(panel, profile);

        // Welcome message from the summary step streamed content
        const welcomeMsg: ChatMessage = {
          id:        'welcome',
          role:      'assistant',
          content:   summaryMsg || 'Welcome! I\'ve analysed your profile. Ask me anything about your health.',
          timestamp: new Date().toISOString(),
        };

        set({
          hasCompletedOnboarding: true,
          intakeProfile: profile,
          labPanel: panel,
          actions,
          messages: [welcomeMsg],
        });
      },

      resetOnboarding: () => set({
        hasCompletedOnboarding: false,
        intakeProfile: null,
        labPanel: null,
        wearableData: null,
        actions: [],
        messages: [],
      }),

      // ── Lab panel ───────────────────────────────────────────────────────
      labPanel: null,
      setLabPanel: (panel: LabPanel) => {
        const { intakeProfile } = get();
        const actions = generateActionsFromPanel(panel, intakeProfile ?? undefined);
        // Preserve completed state from existing actions
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

      // ── Chat ────────────────────────────────────────────────────────────
      // Start empty — CoachScreen renders its own empty/starter state
      messages: [],

      addMessage: (msg) =>
        set((state) => ({ messages: [...state.messages, msg] })),

      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'bioprecision-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist serialisable fields — exclude functions
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        intakeProfile:          state.intakeProfile,
        labPanel:               state.labPanel,
        wearableData:           state.wearableData,
        messages:               state.messages,
        actions:                state.actions,
      }),
    }
  )
);

// Re-export for backward compatibility
export { MOCK_ACTIONS };
export { buildLabPanel, generateActionsFromPanel } from './biomarkers';
