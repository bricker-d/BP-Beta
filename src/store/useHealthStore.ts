import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { LabPanel, WearableData, HealthAction, ChatMessage, UserProfile } from "@/lib/types";

interface IntakeProfile {
  // Core
  name?: string;
  email?: string;
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
  activeConditions?: string[];
  allergies?: string[];
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

export interface DayLog {
  date: string;       // ISO date "2025-05-01"
  completed: number;
  total: number;
}

interface HealthStore {
  user: UserProfile;
  setUser: (user: UserProfile) => void;

  intakeProfile: IntakeProfile | null;
  setIntakeProfile: (profile: IntakeProfile | null) => void;

  labPanel: LabPanel | null;
  previousLabPanel: LabPanel | null;
  labHistory: LabPanel[];
  setLabPanel: (panel: LabPanel) => void;

  patientId: string | null;
  syncPatient: () => Promise<void>;

  wearableData: WearableData | null;
  setWearableData: (data: WearableData) => void;

  actions: HealthAction[];
  setActions: (actions: HealthAction[]) => void;
  toggleAction: (id: string) => void;
  isGeneratingActions: boolean;
  allOptimal: boolean;

  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  clearMessages: () => void;

  isProcessingUpload: boolean;
  uploadProgress: number;
  setUploadState: (processing: boolean, progress?: number) => void;

  tutorialDismissed: boolean;
  dismissTutorial: () => void;

  streak: number;
  lastCompletedDate: string | null;
  completionHistory: DayLog[];

  deviceId: string;
}

export const useHealthStore = create<HealthStore>()(
  persist(
    (set, get) => ({
      deviceId: typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36).slice(2),

      user: { name: "", avatarInitials: "" },
      setUser: (user) => set({ user }),

      intakeProfile: null,
      setIntakeProfile: (profile) => set({ intakeProfile: profile }),

      labPanel: null,
      previousLabPanel: null,
      labHistory: [],
      patientId: null,

      syncPatient: async () => {
        const { deviceId, intakeProfile, patientId } = get();
        if (!intakeProfile?.name) return;
        try {
          const res = await fetch("/api/patient", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deviceId, profile: intakeProfile }),
          });
          if (!res.ok) return;
          const data = await res.json();
          if (data.patientId && data.patientId !== patientId) set({ patientId: data.patientId });
        } catch { /* fail silently — app works offline */ }
      },

      setLabPanel: async (panel) => {
        set((state) => ({
          previousLabPanel: state.labPanel,
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
              currentSupplements: state.intakeProfile?.currentSupplements,
              timeHorizon: state.intakeProfile?.timeHorizon,
              painPoint: state.intakeProfile?.painPoint,
              symptoms: state.intakeProfile?.symptoms,
              activeConditions: state.intakeProfile?.activeConditions,
              allergies: state.intakeProfile?.allergies,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.actions)) {
              set({ actions: data.actions, allOptimal: !!data.allOptimal, isGeneratingActions: false });
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
      allOptimal: false,
      toggleAction: (id) =>
        set((state) => {
          const updated = state.actions.map((a) =>
            a.id === id ? { ...a, completed: !a.completed } : a
          );
          const completedCount = updated.filter(a => a.completed).length;
          const allDone = updated.length > 0 && completedCount === updated.length;
          const today = new Date().toISOString().split("T")[0];

          // Streak
          let streak = state.streak;
          let lastCompletedDate = state.lastCompletedDate;
          if (allDone && today !== lastCompletedDate) {
            const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
            streak = lastCompletedDate === yesterday ? streak + 1 : 1;
            lastCompletedDate = today;
          }

          // Completion history — upsert today's record
          const dayLog: DayLog = { date: today, completed: completedCount, total: updated.length };
          const history = state.completionHistory.filter(d => d.date !== today);
          const completionHistory = [...history, dayLog].slice(-90);

          return { actions: updated, streak, lastCompletedDate, completionHistory };
        }),

      completionHistory: [],

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

      streak: 0,
      lastCompletedDate: null,
    }),
    {
      name: "bioprecision-web",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // Reset action completions each new day
        if (!state) return;
        const today = new Date().toISOString().split("T")[0];
        if (state.lastCompletedDate !== today && state.actions.some(a => a.completed)) {
          state.actions = state.actions.map(a => ({ ...a, completed: false }));
        }
      },
      partialize: (state) => ({
        deviceId: state.deviceId,
        patientId: state.patientId,
        user: state.user,
        intakeProfile: state.intakeProfile,
        labPanel: state.labPanel,
        previousLabPanel: state.previousLabPanel,
        labHistory: state.labHistory,
        actions: state.actions,
        messages: state.messages,
        tutorialDismissed: state.tutorialDismissed,
        streak: state.streak,
        lastCompletedDate: state.lastCompletedDate,
        completionHistory: state.completionHistory,
        allOptimal: state.allOptimal,
      }),
    }
  )
);
