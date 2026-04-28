import { create } from "zustand";
import { LabPanel, WearableData, HealthAction, ChatMessage, UserProfile } from "@/lib/types";
import { MOCK_PANEL, MOCK_WEARABLE, MOCK_ACTIONS } from "@/lib/biomarkers";

interface HealthStore {
  // User
  user: UserProfile;
  setUser: (user: UserProfile) => void;

  // Intake profile (from onboarding)
  intakeProfile: {
    name?: string;
    goals?: string[];
    age?: number;
    biologicalSex?: string;
    heightFt?: number;
    heightIn?: number;
    weightLbs?: number;
    symptoms?: string[];
    symptomsOther?: string;
    wearableSource?: string;
  } | null;
  setIntakeProfile: (profile: HealthStore["intakeProfile"]) => void;

  // Lab data
  labPanel: LabPanel | null;
  setLabPanel: (panel: LabPanel) => void;

  // Wearable
  wearableData: WearableData | null;
  setWearableData: (data: WearableData) => void;

  // Actions
  actions: HealthAction[];
  setActions: (actions: HealthAction[]) => void;
  toggleAction: (id: string) => void;
  isGeneratingActions: boolean;

  // Chat
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  clearMessages: () => void;

  // Upload state
  isProcessingUpload: boolean;
  uploadProgress: number;
  setUploadState: (processing: boolean, progress?: number) => void;
}

export const useHealthStore = create<HealthStore>((set, get) => ({
  user: { name: "Alex", avatarInitials: "A" },
  setUser: (user) => set({ user }),

  intakeProfile: null,
  setIntakeProfile: (profile) => set({ intakeProfile: profile }),

  labPanel: MOCK_PANEL,
  setLabPanel: async (panel) => {
    set({ labPanel: panel, isGeneratingActions: true });

    try {
      const state = get();
      const res = await fetch("/api/generate-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labPanel: panel,
          wearableData: state.wearableData,
          goals: state.intakeProfile?.goals,
          patientName: state.intakeProfile?.name || state.user.name,
        }),
      });

      if (res.ok) {
        const { actions } = await res.json();
        if (actions && Array.isArray(actions)) {
          set({ actions, isGeneratingActions: false });
          return;
        }
      }
    } catch (err) {
      console.error("Action generation failed, falling back to mock:", err);
    }

    set({ actions: MOCK_ACTIONS, isGeneratingActions: false });
  },

  wearableData: MOCK_WEARABLE,
  setWearableData: (data) => set({ wearableData: data }),

  actions: MOCK_ACTIONS,
  setActions: (actions) => set({ actions }),
  isGeneratingActions: false,
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
      timestamp: "2025-01-18T09:00:00.000Z",
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
