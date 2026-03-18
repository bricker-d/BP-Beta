import { create } from 'zustand';
import { MOCK_ACTIONS, MOCK_PANEL } from './biomarkers';
import type { HealthAction, ChatMessage } from './types';

interface HealthStore {
  actions: HealthAction[];
  toggleAction: (id: string) => void;
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  clearMessages: () => void;
}

export const useHealthStore = create<HealthStore>((set) => ({
  actions: MOCK_ACTIONS,
  toggleAction: (id) =>
    set((state) => ({
      actions: state.actions.map((a) =>
        a.id === id ? { ...a, completed: !a.completed } : a
      ),
    })),
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I've reviewed your lab results. Your Fasting Glucose is borderline at 102 mg/dL — that is your biggest area to address. What would you like to know?",
      timestamp: new Date().toISOString(),
    } as any,
  ],
  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),
  clearMessages: () => set({ messages: [] }),
}));

export { MOCK_PANEL };
