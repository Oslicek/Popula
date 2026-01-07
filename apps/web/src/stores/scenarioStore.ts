import { create } from 'zustand';
import type { Scenario, ScenarioSummary, ProjectionResult } from '@popula/shared-types';

interface ScenarioState {
  // Data
  scenarios: ScenarioSummary[];
  currentScenario: Scenario | null;
  currentProjection: ProjectionResult | null;
  
  // UI State
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setScenarios: (scenarios: ScenarioSummary[]) => void;
  setCurrentScenario: (scenario: Scenario | null) => void;
  setCurrentProjection: (projection: ProjectionResult | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Async actions (will integrate with NATS)
  loadScenarios: () => Promise<void>;
  loadScenario: (id: string) => Promise<void>;
  createScenario: (scenario: Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteScenario: (id: string) => Promise<void>;
}

export const useScenarioStore = create<ScenarioState>((set, get) => ({
  scenarios: [],
  currentScenario: null,
  currentProjection: null,
  isLoading: false,
  error: null,
  
  setScenarios: (scenarios) => set({ scenarios }),
  setCurrentScenario: (scenario) => set({ currentScenario: scenario }),
  setCurrentProjection: (projection) => set({ currentProjection: projection }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  
  loadScenarios: async () => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Fetch from NATS
      // For now, return empty list
      set({ scenarios: [], isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load scenarios';
      set({ error: message, isLoading: false });
    }
  },
  
  loadScenario: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Fetch from NATS
      console.log('Loading scenario:', id);
      set({ currentScenario: null, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load scenario';
      set({ error: message, isLoading: false });
    }
  },
  
  createScenario: async (scenario) => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Send to NATS
      console.log('Creating scenario:', scenario);
      set({ isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create scenario';
      set({ error: message, isLoading: false });
    }
  },
  
  deleteScenario: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Send to NATS
      console.log('Deleting scenario:', id);
      const { scenarios } = get();
      set({ 
        scenarios: scenarios.filter(s => s.id !== id),
        isLoading: false 
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete scenario';
      set({ error: message, isLoading: false });
    }
  },
}));


