import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOCK_ACTIONS, MOCK_PANEL } from './biomarkers';
import type { HealthAction, ChatMessage, IntakeProfile } from './types';

interface HealthStore {
  // ── Onboarding ──────────────────────────────────────────────────────────────
    hasCompletedOnboarding: boolean;
      intakeProfile: IntakeProfile | null;
        completeOnboarding: (profile: IntakeProfile, summaryMsg: string) => void;
          resetOnboarding: () => void;

            // ── Actions ──────────────────────────────────────────────────────────────────
              actions: HealthAction[];
                toggleAction: (id: string) => void;

                  // ── Chat ─────────────────────────────────────────────────────────────────────
                    messages: ChatMessage[];
                      addMessage: (msg: ChatMessage) => void;
                        clearMessages: () => void;
                        }

                        const DEFAULT_WELCOME: ChatMessage = {
                          id: 'welcome',
                            role: 'assistant',
                              content:
                                  "Hi! I've reviewed your lab results. Your Fasting Glucose is borderline at 102 mg/dL — that's your biggest area to address. What would you like to know?",
                                    timestamp: new Date('2026-03-18T10:00:00').toISOString(),
                                    } as any;

                                    export const useHealthStore = create<HealthStore>()(
                                      persist(
                                          (set) => ({
                                                // ── Onboarding ────────────────────────────────────────────────────────────
                                                      hasCompletedOnboarding: false,
                                                            intakeProfile: null,

                                                                  completeOnboarding: (profile, summaryMsg) => {
                                                                          const welcomeMsg: ChatMessage = {
                                                                                    id: 'welcome',
                                                                                              role: 'assistant',
                                                                                                        content: summaryMsg,
                                                                                                                  timestamp: new Date().toISOString(),
                                                                                                                          } as any;
                                                                                                                                  set({
                                                                                                                                            hasCompletedOnboarding: true,
                                                                                                                                                      intakeProfile: { ...profile, completedAt: new Date().toISOString() },
                                                                                                                                                                messages: [welcomeMsg],
                                                                                                                                                                        });
                                                                                                                                                                              },

                                                                                                                                                                                    resetOnboarding: () =>
                                                                                                                                                                                            set({
                                                                                                                                                                                                      hasCompletedOnboarding: false,
                                                                                                                                                                                                                intakeProfile: null,
                                                                                                                                                                                                                          messages: [DEFAULT_WELCOME],
                                                                                                                                                                                                                                    actions: MOCK_ACTIONS,
                                                                                                                                                                                                                                            }),

                                                                                                                                                                                                                                                  // ── Actions ──────────────────────────────────────────────────────────────
                                                                                                                                                                                                                                                        actions: MOCK_ACTIONS,
                                                                                                                                                                                                                                                              toggleAction: (id) =>
                                                                                                                                                                                                                                                                      set((state) => ({
                                                                                                                                                                                                                                                                                actions: state.actions.map((a) =>
                                                                                                                                                                                                                                                                                            a.id === id ? { ...a, completed: !a.completed } : a
                                                                                                                                                                                                                                                                                                      ),
                                                                                                                                                                                                                                                                                                              })),

                                                                                                                                                                                                                                                                                                                    // ── Chat ─────────────────────────────────────────────────────────────────
                                                                                                                                                                                                                                                                                                                          messages: [DEFAULT_WELCOME],
                                                                                                                                                                                                                                                                                                                                addMessage: (msg) =>
                                                                                                                                                                                                                                                                                                                                        set((state) => ({ messages: [...state.messages, msg] })),
                                                                                                                                                                                                                                                                                                                                              clearMessages: () => set({ messages: [] }),
                                                                                                                                                                                                                                                                                                                                                  }),
                                                                                                                                                                                                                                                                                                                                                      {
                                                                                                                                                                                                                                                                                                                                                            name: 'bioprecision-store',          // AsyncStorage key
                                                                                                                                                                                                                                                                                                                                                                  storage: createJSONStorage(() => AsyncStorage),
                                                                                                                                                                                                                                                                                                                                                                        // Only persist the fields that should survive app restart.
                                                                                                                                                                                                                                                                                                                                                                              // Actions (functions) are NOT serialisable — exclude them.
                                                                                                                                                                                                                                                                                                                                                                                    partialize: (state) => ({
                                                                                                                                                                                                                                                                                                                                                                                            hasCompletedOnboarding: state.hasCompletedOnboarding,
                                                                                                                                                                                                                                                                                                                                                                                                    intakeProfile: state.intakeProfile,
                                                                                                                                                                                                                                                                                                                                                                                                            messages: state.messages,
                                                                                                                                                                                                                                                                                                                                                                                                                    actions: state.actions,
                                                                                                                                                                                                                                                                                                                                                                                                                          }),
                                                                                                                                                                                                                                                                                                                                                                                                                              }
                                                                                                                                                                                                                                                                                                                                                                                                                                )
                                                                                                                                                                                                                                                                                                                                                                                                                                );

                                                                                                                                                                                                                                                                                                                                                                                                                                export { MOCK_PANEL };