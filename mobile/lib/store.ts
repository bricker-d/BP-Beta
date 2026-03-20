import { create } from 'zustand';
import { MOCK_ACTIONS, MOCK_PANEL } from './biomarkers';
import type { HealthAction, ChatMessage, IntakeProfile } from './types';

interface HealthStore {
  // ── Onboarding ──────────────────────────────────────────────────────────────
    hasCompletedOnboarding: boolean;
      intakeProfile: IntakeProfile | null;
        completeOnboarding: (profile: IntakeProfile, summaryMsg: string) => void;

          // ── Actions ──────────────────────────────────────────────────────────────────
            actions: HealthAction[];
              toggleAction: (id: string) => void;

                // ── Chat ─────────────────────────────────────────────────────────────────────
                  messages: ChatMessage[];
                    addMessage: (msg: ChatMessage) => void;
                      clearMessages: () => void;
                      }

                      export const useHealthStore = create<HealthStore>((set, get) => ({
                        // ── Onboarding ──────────────────────────────────────────────────────────────
                          hasCompletedOnboarding: false,
                            intakeProfile: null,
                              completeOnboarding: (profile, summaryMsg) => {
                                  const firstName = profile.name?.split(' ')[0] ?? '';
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

                                                                                                // ── Actions ──────────────────────────────────────────────────────────────────
                                                                                                  actions: MOCK_ACTIONS,
                                                                                                    toggleAction: (id) =>
                                                                                                        set((state) => ({
                                                                                                              actions: state.actions.map((a) =>
                                                                                                                      a.id === id ? { ...a, completed: !a.completed } : a
                                                                                                                            ),
                                                                                                                                })),

                                                                                                                                  // ── Chat ─────────────────────────────────────────────────────────────────────
                                                                                                                                    messages: [
                                                                                                                                        {
                                                                                                                                              id: 'welcome',
                                                                                                                                                    role: 'assistant',
                                                                                                                                                          content:
                                                                                                                                                                  "Hi! I've reviewed your lab results. Your Fasting Glucose is borderline at 102 mg/dL — that's your biggest area to address. What would you like to know?",
                                                                                                                                                                        timestamp: new Date('2026-03-18T10:00:00').toISOString(),
                                                                                                                                                                            } as any,
                                                                                                                                                                              ],
                                                                                                                                                                                addMessage: (msg) =>
                                                                                                                                                                                    set((state) => ({ messages: [...state.messages, msg] })),
                                                                                                                                                                                      clearMessages: () => set({ messages: [] }),
                                                                                                                                                                                      }));

                                                                                                                                                                                      export { MOCK_PANEL };