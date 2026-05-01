import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { LabPanel, WearableData, HealthAction, ChatMessage, UserProfile } from "@/lib/types";

interface IntakeProfile {
  // Core
  name?: string;
  goals?: string[];
  age?: number;
  biologicalSex?: string;
  heightFt?: number;
  heightIn?: number;
  weightLbs?: number;
  // Why they're here
  painPoint?: string;
  timeHorizon?: string;
  // Medical context
  medications?: string[];
  familyHistory?: string[];
  // Habits baseline
  sleepHours?: number;
  exerciseDaysPerWeek?: string;
  exerciseType?: string;
  dietStyle?: string;
  stressLevel?: number;
  alcoholFrequency?: string;
  currentSupplements?: string[];
  // Symptoms
  symptoms?: string[];
  symptomsOther?: string;
  // Accountability preferences
  notificationStyle?: string;
  checkInTime?: string;
  eveningReminderTime?: string;
  // Wearable
  wearableSource?: string;
  // AI-generated summary (set after intake-summary API call)
  intakeSummary?: string;
}

interface HealthStore {
  user: UserProfile;
  setUser: (user: UserProfile) => void;

  intakeProfile: IntakeProfile | null;
  setIntakeProfile: (profile: IntakeProfile | null) => void;

  labPanel: LabPanel | null;
  labHistory: LabPanel[];
  setLabPanel: (panel: LabPanel) => void;

  wearableData: WearableData | null;
  setWearableData: (data: WearableData) => void;

  actions: HealthAction[];
  setActions: (actions: HealthAction[]) => void;
  toggleAction: (id: string) => void;
  isGeneratingActions: boolean;

  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  clearMessages: () => void;

  isProcessingUpload: boolean;
  uploadProgress: number;
  setUploadState: (processing: boolean, progress?: number) => void;

  tutorialDismissed: boolean;
  dismissTutorial: () => void;
}

export const useHealthStore = create<HealthStore>()(
  persist(
    (set, get) => ({
      user: { name: "", avatarInitials: "" },
      setUser: (user) => set({ user }),

      intakeProfile: null,
      setIntakeProfile: (profile) => set({ intakeProfile: profile }),

      labPanel: null,
      labHistory: [],
      setLabPanel: async (panel) => {
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
              biologicalSex: state.intakeProfile?.biologicalSex,
              patientName: state.intakeProfile?.name || state.user.name,
              habits: {
                sleepHours:          state.intakeProfile?.sleepHours,
                exerciseDaysPerWeek: state.intakeProfile?.exerciseDaysPerWeek,
                exerciseType:        state.intakeProfile?.exerciseType,
                dietStyle:           state.intakeProfile?.dietStyle,
                stressLevel:         state.intakeProfile?.stressLevel,
                alcoholFrequency:    state.intakeProfile?.alcoholFrequency,
              },
              medications: state.intakeProfile?.medications,
              timeHorizon: state.intakeProfile?.timeHorizon,
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

      tutorialDismissed: false,
      dismissTutorial: () => set({ tutorialDismissed: true }),
    }),
    {
      name: "bioprecision-web",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        intakeProfile: state.intakeProfile,
        labPanel: state.labPanel,
        labHistory: state.labHistory,
        actions: state.actions,
        messages: state.messages,
        tutorialDismissed: state.tutorialDismissed,
      }),
    }
  )
);
