import { create } from 'zustand';
import type {
  DaySimulationData,
  PhysiologicalDomainKey,
  ExplainedAlert,
  PatientProfile,
  TimelineBookmark,
  SubjectiveCheckIn,
} from '../types';
import {
  generate200DaySimulation,
  DEFAULT_PROFILES,
  DEFAULT_BOOKMARKS,
  calculateConcordance,
} from '../utils/simulationEngine';
import { db, initializeDatabase } from '../db';

interface SimulationState {
  currentDay: number;
  isPlaying: boolean;
  playbackSpeed: 1 | 2 | 5 | 10;
  selectedDomain: PhysiologicalDomainKey | 'all';
  activeAlert: ExplainedAlert | null;
  isAlertDrawerOpen: boolean;
  isCheckInModalOpen: boolean;
  isExportModalOpen: boolean;
  isDomainModalOpen: boolean;
  inspectingDomain: PhysiologicalDomainKey | null;
  activeProfile: PatientProfile;
  availableProfiles: PatientProfile[];
  simulationData: DaySimulationData[];
  bookmarks: TimelineBookmark[];
  checkInHistory: SubjectiveCheckIn[];
  dbInitialized: boolean;

  // Actions
  init: () => Promise<void>;
  setCurrentDay: (day: number) => void;
  stepDay: (delta: number) => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: 1 | 2 | 5 | 10) => void;
  setSelectedDomain: (domain: PhysiologicalDomainKey | 'all') => void;
  openAlertDrawer: (alert?: ExplainedAlert) => void;
  closeAlertDrawer: () => void;
  acknowledgeCurrentAlert: () => Promise<void>;
  openCheckInModal: () => void;
  closeCheckInModal: () => void;
  submitCheckIn: (
    checkInData: Omit<SubjectiveCheckIn, 'id' | 'concordanceScore' | 'concordanceLabel'>
  ) => Promise<SubjectiveCheckIn>;
  openDomainModal: (domain: PhysiologicalDomainKey) => void;
  closeDomainModal: () => void;
  openExportModal: () => void;
  closeExportModal: () => void;
  selectProfile: (profileId: string) => void;
}

const initialProfile = DEFAULT_PROFILES[0];
const initialData = generate200DaySimulation(initialProfile);

export const useSimulationStore = create<SimulationState>((set, get) => ({
  currentDay: 136, // Start at key peak allostatic decompensation event so user sees active state and alert immediately
  isPlaying: false,
  playbackSpeed: 2,
  selectedDomain: 'all',
  activeAlert: initialData[135].activeAlert ?? null,
  isAlertDrawerOpen: false,
  isCheckInModalOpen: false,
  isExportModalOpen: false,
  isDomainModalOpen: false,
  inspectingDomain: null,
  activeProfile: initialProfile,
  availableProfiles: DEFAULT_PROFILES,
  simulationData: initialData,
  bookmarks: DEFAULT_BOOKMARKS,
  checkInHistory: [],
  dbInitialized: false,

  init: async () => {
    if (get().dbInitialized) return;
    try {
      await initializeDatabase(DEFAULT_BOOKMARKS, DEFAULT_PROFILES);
      const pastCheckIns = await db.checkIns.toArray();
      set({ checkInHistory: pastCheckIns, dbInitialized: true });
    } catch (e) {
      console.warn('DB initialization notice:', e);
      set({ dbInitialized: true });
    }
  },

  setCurrentDay: (day: number) => {
    const clampedDay = Math.max(1, Math.min(200, Math.round(day)));
    const dayData = get().simulationData[clampedDay - 1];
    set({
      currentDay: clampedDay,
      activeAlert: dayData?.activeAlert ?? null,
    });
  },

  stepDay: (delta: number) => {
    const { currentDay, setCurrentDay } = get();
    setCurrentDay(currentDay + delta);
  },

  togglePlay: () => {
    set(state => ({ isPlaying: !state.isPlaying }));
  },

  setPlaying: (playing: boolean) => {
    set({ isPlaying: playing });
  },

  setPlaybackSpeed: (speed: 1 | 2 | 5 | 10) => {
    set({ playbackSpeed: speed });
  },

  setSelectedDomain: (domain: PhysiologicalDomainKey | 'all') => {
    set({ selectedDomain: domain });
  },

  openAlertDrawer: (alert?: ExplainedAlert) => {
    const targetAlert = alert ?? get().activeAlert;
    if (targetAlert) {
      set({ activeAlert: targetAlert, isAlertDrawerOpen: true, isPlaying: false });
    }
  },

  closeAlertDrawer: () => {
    set({ isAlertDrawerOpen: false });
  },

  acknowledgeCurrentAlert: async () => {
    const currentAlert = get().activeAlert;
    if (!currentAlert) return;

    const updatedAlert: ExplainedAlert = {
      ...currentAlert,
      acknowledged: true,
      triagedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    try {
      await db.alerts.put(updatedAlert);
    } catch (e) {
      console.warn('Dexie alert save notice:', e);
    }

    set(state => {
      const updatedSimData = [...state.simulationData];
      const dayIndex = updatedAlert.day - 1;
      if (updatedSimData[dayIndex]) {
        updatedSimData[dayIndex] = {
          ...updatedSimData[dayIndex],
          activeAlert: updatedAlert,
        };
      }
      return {
        activeAlert: updatedAlert,
        simulationData: updatedSimData,
      };
    });
  },

  openCheckInModal: () => {
    set({ isCheckInModalOpen: true, isPlaying: false });
  },

  closeCheckInModal: () => {
    set({ isCheckInModalOpen: false });
  },

  submitCheckIn: async (checkInData) => {
    const { currentDay, simulationData, checkInHistory } = get();
    const currentDayData = simulationData[currentDay - 1];
    const concordance = calculateConcordance(checkInData, currentDayData);

    const fullRecord: SubjectiveCheckIn = {
      ...checkInData,
      concordanceScore: concordance.score,
      concordanceLabel: concordance.label,
    };

    try {
      const id = await db.checkIns.add(fullRecord);
      fullRecord.id = id;
    } catch (e) {
      console.warn('Dexie add check-in notice:', e);
      fullRecord.id = Date.now();
    }

    set({
      checkInHistory: [fullRecord, ...checkInHistory],
      isCheckInModalOpen: false,
    });

    return fullRecord;
  },

  openDomainModal: (domain: PhysiologicalDomainKey) => {
    set({ inspectingDomain: domain, isDomainModalOpen: true, isPlaying: false });
  },

  closeDomainModal: () => {
    set({ isDomainModalOpen: false, inspectingDomain: null });
  },

  openExportModal: () => {
    set({ isExportModalOpen: true, isPlaying: false });
  },

  closeExportModal: () => {
    set({ isExportModalOpen: false });
  },

  selectProfile: (profileId: string) => {
    const profile = get().availableProfiles.find(p => p.id === profileId) ?? DEFAULT_PROFILES[0];
    const newData = generate200DaySimulation(profile);
    const dayData = newData[get().currentDay - 1];
    set({
      activeProfile: profile,
      simulationData: newData,
      activeAlert: dayData?.activeAlert ?? null,
      isPlaying: false,
    });
  },
}));
