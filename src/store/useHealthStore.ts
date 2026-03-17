import { create } from "zustand";
import { LabPanel, WearableData, HealthAction, ChatMessage, UserProfile } from "@/lib/types";
import { MOCK_PANEL, MOCK_WEARABLE, MOCK_ACTIONS } from "@/lib/biomarkers";

interface HealthStore {
  // User
  user: UserProfile;

  // Lab data
  labPanel: LabPanel | null;
  setLabPanel: (panel: LabPanel) => void;

  // Wearable
  wearableData: WearableData | null;

  // Actions
  actions: HealthAction[];
  toggleAction: (id: string) => void;

  // Chat
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  clearMessages: () => void;

  // Upload state
  isProcessingUpload: boolean;
  uploadProgress: number;
  setUploadState: (processing: boolean, progress?: number) => void;
}

export const useHealthStore = create<HealthStore>((set) => ({
  user: { name: "Alex", avatarInitials: "A" },

  labPanel: MOCK_PANEL,
  setLabPanel: (panel) => set({ labPanel: panel }),

  wearableData: MOCK_WEARABLE,

  actions: MOCK_ACTIONS,
  toggleAction: (id) =>
    set((state) => ({
      actions: state.actions.map((a) =>
        a.id === id ? { ...a, completed: !a.completed } : a
      ),
    })),

  messages: [
    {
      id: "welcome",
      role: "assistant",
      content:
        "I've reviewed your lab results and identified **6 biomarkers** that need attention.\n\nYour **Fasting Glucose** is currently 102 mg/dL (elevated). This is your biggest constraint right now, so I've prioritized actions to address it.\n\nI'm here 24/7 to answer questions, explain your results, and adjust your plan based on real-time data. What would you like to know?",
      timestamp: new Date().toISOString(),
    },
  ],
  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),
  clearMessages: () => set({ messages: [] }),

  isProcessingUpload: false,
  uploadProgress: 0,
  setUploadState: (processing, progress = 0) =>
    set({ isProcessingUpload: processing, uploadProgress: progress }),
}));
