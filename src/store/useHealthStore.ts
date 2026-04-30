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
  labHistory: LabPanel[];              // all panels in chronological order
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

  labPanel: null,
  labHistory: [],
  setLabPanel: async (panel) => {
    // Add to history (keep up to 24 panels — 6 years of quarterly)
    set((state) => ({
      labPanel: panel,
      labHistory: [...state.labHistory.filter(p => p.date !== panel.date), panel]
        .sort((a, b) => new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime())
        .slice(-24),
      isGeneratingActions: true,
    }));

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
      console.error("Action generation failed:", err);
    }

    set({ isGeneratingActions: false });
  },

  wearableData: null,
  setWearableData: (data) => set({ wearableData: data }),

  actions: [],
  setActions: (actions) => set({ actions }),
  isGeneratingActions: false,
  toggleAction: (id) =>
    set((state) => ({
      actions: state.actions.map((a) =>
        a.id === id ? { ...a, completed: !a.completed } : a
      ),
    })),

  messages: [],
  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),
  clearMessages: () => set({ messages: [] }),

  isProcessingUpload: false,
  uploadProgress: 0,
  setUploadState: (processing, progress = 0) =>
    set({ isProcessingUpload: processing, uploadProgress: progress }),
}));
