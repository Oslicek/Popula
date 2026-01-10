/**
 * Runs Store
 * 
 * Manages projection runs and data jobs
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type RunType = 'projection' | 'data_job';
export type RunStatus = 'queued' | 'running' | 'done' | 'failed';

export interface Run {
  id: string;
  type: RunType;
  status: RunStatus;
  name: string;
  description?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  // Projection-specific
  projectId?: string;
  scenarioId?: string;
  baseYear?: number;
  endYear?: number;
  // Results
  durationMs?: number;
  resultSummary?: {
    totalPopulation?: number;
    yearsProjected?: number;
    regionsProcessed?: number;
  };
}

interface RunsState {
  runs: Run[];
  selectedRunIds: string[];
  filter: {
    type: RunType | 'all';
    status: RunStatus | 'all';
  };
}

interface RunsActions {
  addRun: (run: Omit<Run, 'id' | 'createdAt'>) => string;
  updateRun: (id: string, updates: Partial<Run>) => void;
  removeRun: (id: string) => void;
  selectRun: (id: string) => void;
  deselectRun: (id: string) => void;
  toggleRunSelection: (id: string) => void;
  clearSelection: () => void;
  setFilter: (filter: Partial<RunsState['filter']>) => void;
  getRunById: (id: string) => Run | undefined;
  getFilteredRuns: () => Run[];
  clearCompletedRuns: () => void;
}

const generateId = () => `run_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const useRunsStore = create<RunsState & RunsActions>()(
  persist(
    (set, get) => ({
      // State
      runs: [],
      selectedRunIds: [],
      filter: {
        type: 'all',
        status: 'all',
      },

      // Actions
      addRun: (runData) => {
        const id = generateId();
        const newRun: Run = {
          ...runData,
          id,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          runs: [newRun, ...state.runs], // Most recent first
        }));
        return id;
      },

      updateRun: (id, updates) => {
        set((state) => ({
          runs: state.runs.map((run) =>
            run.id === id ? { ...run, ...updates } : run
          ),
        }));
      },

      removeRun: (id) => {
        set((state) => ({
          runs: state.runs.filter((run) => run.id !== id),
          selectedRunIds: state.selectedRunIds.filter((sid) => sid !== id),
        }));
      },

      selectRun: (id) => {
        set((state) => {
          if (state.selectedRunIds.includes(id)) return state;
          // Limit to 4 selections for comparison
          if (state.selectedRunIds.length >= 4) {
            return {
              selectedRunIds: [...state.selectedRunIds.slice(1), id],
            };
          }
          return {
            selectedRunIds: [...state.selectedRunIds, id],
          };
        });
      },

      deselectRun: (id) => {
        set((state) => ({
          selectedRunIds: state.selectedRunIds.filter((sid) => sid !== id),
        }));
      },

      toggleRunSelection: (id) => {
        const { selectedRunIds, selectRun, deselectRun } = get();
        if (selectedRunIds.includes(id)) {
          deselectRun(id);
        } else {
          selectRun(id);
        }
      },

      clearSelection: () => {
        set({ selectedRunIds: [] });
      },

      setFilter: (filter) => {
        set((state) => ({
          filter: { ...state.filter, ...filter },
        }));
      },

      getRunById: (id) => {
        return get().runs.find((run) => run.id === id);
      },

      getFilteredRuns: () => {
        const { runs, filter } = get();
        return runs.filter((run) => {
          if (filter.type !== 'all' && run.type !== filter.type) return false;
          if (filter.status !== 'all' && run.status !== filter.status) return false;
          return true;
        });
      },

      clearCompletedRuns: () => {
        set((state) => ({
          runs: state.runs.filter((run) => run.status !== 'done' && run.status !== 'failed'),
          selectedRunIds: state.selectedRunIds.filter((id) =>
            state.runs.some((run) => run.id === id && run.status !== 'done' && run.status !== 'failed')
          ),
        }));
      },
    }),
    {
      name: 'popula-runs-store',
      partialize: (state) => ({
        runs: state.runs.slice(0, 100), // Keep last 100 runs
        filter: state.filter,
      }),
    }
  )
);

// Selectors
export const selectQueuedRuns = (state: RunsState) => state.runs.filter((r) => r.status === 'queued');
export const selectRunningRuns = (state: RunsState) => state.runs.filter((r) => r.status === 'running');
export const selectCompletedRuns = (state: RunsState) => state.runs.filter((r) => r.status === 'done');
export const selectFailedRuns = (state: RunsState) => state.runs.filter((r) => r.status === 'failed');
export const selectSelectedRuns = (state: RunsState & RunsActions) => 
  state.selectedRunIds.map((id) => state.runs.find((r) => r.id === id)).filter(Boolean) as Run[];
