// src/stores/useMissionStore.ts
import { create } from 'zustand';
import type { InjectedScenario } from '../lib/mock/generator';
import { getLocalMission, loadBackendMission, type MissionData } from '../lib/dataSource';
import { predictScenario, type PredictionLookup } from '../lib/predictions';

export type ScenarioPrediction =
  | { status: 'idle' | 'running'; results?: never }
  | { status: 'ready'; results: PredictionLookup }
  | { status: 'error'; message: string; results?: never };

interface MissionState extends MissionData {
  currentDay: number;
  selectedCrewId: string; // 'CREW-01' | 'CREW-02' | 'CREW-03'
  isPlaying: boolean;
  playbackSpeed: 1 | 2 | 5 | 10;
  activeScenario: InjectedScenario;
  isMissionControlMode: boolean;
  isSidebarCollapsed: boolean;
  selectedAlertId: string | null;
  toastMessage: string | null;
  alertStatusOverrides: Record<string, 'open' | 'acknowledged' | 'resolved'>;
  dataSource: 'connecting' | 'backend' | 'offline' | 'scenario';
  scenarioPrediction: ScenarioPrediction;

  // Actions
  connectMission: () => Promise<void>;
  setCurrentDay: (day: number) => void;
  stepDay: (delta: number) => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: 1 | 2 | 5 | 10) => void;
  setSelectedCrewId: (id: string) => void;
  triggerScenario: (scenario: InjectedScenario) => Promise<void>;
  toggleMissionControlMode: () => void;
  toggleSidebar: () => void;
  setSelectedAlertId: (id: string | null) => void;
  acknowledgeAlert: (alertId: string) => void;
  resolveAlert: (alertId: string) => void;
  clearToast: () => void;
}

const initialMission = getLocalMission('none');
let missionRequest = 0;
let scenarioPredictionQueue = Promise.resolve();

export const useMissionStore = create<MissionState>((set, get) => ({
  currentDay: 50,
  selectedCrewId: 'CREW-01',
  isPlaying: false,
  playbackSpeed: 2,
  activeScenario: 'none',
  isMissionControlMode: false,
  isSidebarCollapsed: false,
  selectedAlertId: null,
  toastMessage: null,
  alertStatusOverrides: {},
  dataSource: 'connecting',
  scenarioPrediction: { status: 'idle' },

  ...initialMission,

  connectMission: async () => {
    const request = ++missionRequest;
    set({ dataSource: 'connecting', activeScenario: 'none', scenarioPrediction: { status: 'idle' } });
    try {
      const mission = await loadBackendMission();
      if (request !== missionRequest) return;
      set({
        ...mission,
        dataSource: 'backend',
        activeScenario: 'none',
        selectedAlertId: null,
        selectedCrewId: mission.crew.some(({ id }) => id === get().selectedCrewId)
          ? get().selectedCrewId : mission.crew[0].id,
        toastMessage: null,
      });
    } catch {
      if (request !== missionRequest) return;
      set({
        ...initialMission,
        dataSource: 'offline',
        activeScenario: 'none',
        selectedAlertId: null,
        toastMessage: 'The NovaPulse API is unavailable. Showing the offline simulation.',
      });
    }
  },

  setCurrentDay: (day: number) => {
    const clamped = Math.max(1, Math.min(200, Math.round(day)));
    set({ currentDay: clamped });
  },

  stepDay: (delta: number) => {
    const { currentDay, setCurrentDay } = get();
    setCurrentDay(currentDay + delta);
  },

  togglePlay: () => {
    set((state) => ({ isPlaying: !state.isPlaying }));
  },

  setPlaying: (playing: boolean) => {
    set({ isPlaying: playing });
  },

  setPlaybackSpeed: (speed: 1 | 2 | 5 | 10) => {
    set({ playbackSpeed: speed });
  },

  setSelectedCrewId: (id: string) => {
    set({ selectedCrewId: id });
  },

  triggerScenario: (scenario: InjectedScenario) => {
    if (scenario === 'none') {
      set({ currentDay: 50, isPlaying: false });
      return get().connectMission();
    }

    const request = ++missionRequest;
    const isCurrent = () => request === missionRequest;
    const newMission = getLocalMission(scenario);

    const { day, name } = {
      radiation: { day: 50, name: 'Solar Radiation Storm' },
      co2: { day: 99, name: 'Cabin CO₂ Rise' },
      infection: { day: 139, name: 'Crew-02 Infection Scenario' },
      sleep: { day: 173, name: 'Sleep Deprivation' },
    }[scenario];

    set({
      ...newMission,
      activeScenario: scenario,
      dataSource: 'scenario',
      scenarioPrediction: { status: 'running' },
      currentDay: day,
      selectedAlertId: null,
      selectedCrewId: newMission.crew.some(({ id }) => id === get().selectedCrewId)
        ? get().selectedCrewId : newMission.crew[0].id,
      isPlaying: false,
      toastMessage: `Local scenario: ${name} • Day ${day}`,
    });

    // Finish the in-flight call before starting another batch on the shared model worker.
    scenarioPredictionQueue = scenarioPredictionQueue.then(async () => {
      if (!isCurrent()) return;
      try {
        const results = await predictScenario(newMission.readings, isCurrent);
        if (isCurrent()) set({ scenarioPrediction: { status: 'ready', results } });
      } catch (error) {
        if (isCurrent()) set({
          scenarioPrediction: {
            status: 'error',
            message: error instanceof Error ? error.message : 'Could not run the scenario models.',
          },
        });
      }
    });
    return scenarioPredictionQueue;
  },

  toggleMissionControlMode: () => {
    set((state) => ({ isMissionControlMode: !state.isMissionControlMode }));
  },

  toggleSidebar: () => {
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed }));
  },

  setSelectedAlertId: (id: string | null) => {
    set({ selectedAlertId: id });
  },

  acknowledgeAlert: (alertId: string) => {
    set((state) => ({
      alertStatusOverrides: {
        ...state.alertStatusOverrides,
        [alertId]: 'acknowledged',
      },
      toastMessage: `Alert ${alertId} marked as Acknowledged. Logged in flight recorder.`,
    }));
  },

  resolveAlert: (alertId: string) => {
    set((state) => ({
      alertStatusOverrides: {
        ...state.alertStatusOverrides,
        [alertId]: 'resolved',
      },
      toastMessage: `Alert ${alertId} marked as Resolved. Escalation cleared.`,
    }));
  },

  clearToast: () => {
    set({ toastMessage: null });
  },
}));
