import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MOCK_ACTIONS,
  buildLabPanel,
  generateActionsFromPanel,
  DEMO_LAB_VALUES,
} from './biomarkers';
import type { HealthAction, ChatMessage, LabPanel } from './types';
import type { IntakeProfile } from './types';

interface HealthStore {
  // — Onboarding ——————————————————————————————————————————————
  hasCompletedOnboarding: boolean;
  intakeProfile: IntakeProfile | null;
  completeOnboarding: (profile: IntakeProfile, summaryMsg: string) => void;
  resetOnboarding: () => void;

  // — Lab panel —————————————————————————————————————————————————
  labPanel: LabPanel | null;
  setLabPanel: (panel: LabPanel) => void;

  // — Actions ——————————————————————————————————————————————————
  actions: HealthAction[];
  toggleAction: (id: string) => void;
  refreshActions: () => void;

  // — Chat ———————————————————————————————————————————————————
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  clearMessages: () => void;
}

const DEFAULT_WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi! I'm your Bioprecision AI coach. Once you complete onboarding I'll have access to your lab results and health profile so I can give you personalised guidance. What would you like to know?",
  timestamp: new Date('2026-03-18T10:00:00').toISOString(),
} as any;

export const useHealthStore = create<HealthStore>()(
  persist(
    (set, get) => ({
      // — Onboarding ——————————————————————————————————————————
      hasCompletedOnboarding: false,
      intakeProfile: null,

      completeOnboarding: (profile, summaryMsg) => {
        // Build the lab panel immediately when onboarding completes
        let panel: LabPanel | null = null;
        if (profile.labDataSource === 'demo') {
          panel = buildLabPanel(DEMO_LAB_VALUES, profile, 'Demo Data');
        }

        // Generate personalised actions from actual panel + intake profile
        const actions = panel
          ? generateActionsFromPanel(panel, profile)
          : MOCK_ACTIONS;

        const welcomeMsg: ChatMessage = {
          id: 'welcome',
          role: 'assistant',
          content: summaryMsg,
          timestamp: new Date().toISOString(),
        } as any;

        set({
          hasCompletedOnboarding: true,
          intakeProfile: { ...profile, completedAt: new Date().toISOString() },
          labPanel: panel,
          actions,
          messages: [welcomeMsg],
        });
      },

      resetOnboarding: () =>
        set({
          hasCompletedOnboarding: false,
          intakeProfile: null,
          labPanel: null,
          actions: MOCK_ACTIONS,
          messages: [DEFAULT_WELCOME],
        }),

      // — Lab panel ——————————————————————————————————————————
      labPanel: null,

      setLabPanel: (panel) => {
        const profile = get().intakeProfile;
        const actions = generateActionsFromPanel(panel, profile);
        set({ labPanel: panel, actions });
      },

      // — Actions ——————————————————————————————————————————
      actions: MOCK_ACTIONS,

      toggleAction: (id) =>
        set((state) => ({
          actions: state.actions.map((a) =>
            a.id === id ? { ...a, completed: !a.completed } : a
          ),
        })),

      refreshActions: () => {
        const { labPanel, intakeProfile } = get();
        if (!labPanel) return;
        const actions = generateActionsFromPanel(labPanel, intakeProfile);
        // Preserve completed state from current actions
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

      // — Chat ———————————————————————————————————————————————
      messages: [DEFAULT_WELCOME],

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
        messages:               state.messages,
        actions:                state.actions,
      }),
    }
  )
);

// Re-export MOCK_PANEL so existing screens don't break during migration
export { MOCK_ACTIONS };
export { buildLabPanel, generateActionsFromPanel } from './biomarkers';
