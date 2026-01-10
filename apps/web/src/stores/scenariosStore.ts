/**
 * Scenarios Store - State management for demographic projection scenarios
 * 
 * Manages:
 * - Scenario CRUD operations
 * - Selection and filtering
 * - Editor state
 * - Parameter validation
 */

import { create } from 'zustand';

// ============================================================
// Types
// ============================================================

export type ScenarioStatus = 'draft' | 'published' | 'archived';

export interface ScenarioParameters {
  fertility?: number;
  mortality?: 'low' | 'medium' | 'high';
  migration?: 'baseline' | 'high' | 'low' | 'zero';
  [key: string]: unknown;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  status: ScenarioStatus;
  owner: string;
  parameters: ScenarioParameters;
  tags: string[];
  lastRunId?: string;
  lastRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ScenariosState {
  // Scenarios
  scenarios: Scenario[];
  addScenario: (scenario: Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateScenario: (id: string, updates: Partial<Scenario>) => void;
  deleteScenario: (id: string) => void;
  duplicateScenario: (id: string) => void;

  // Selection
  selectedScenarioId: string | null;
  selectScenario: (id: string) => void;
  clearSelection: () => void;
  getSelectedScenario: () => Scenario | null;

  // Filtering
  searchQuery: string;
  statusFilter: ScenarioStatus | null;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: ScenarioStatus | null) => void;
  clearFilters: () => void;
  getFilteredScenarios: () => Scenario[];

  // Editor
  isEditorOpen: boolean;
  editingScenario: Scenario | null;
  openEditorForNew: () => void;
  openEditorForScenario: (id: string) => void;
  closeEditor: () => void;

  // Validation
  validateParameters: (params: ScenarioParameters) => ValidationResult;
}

// ============================================================
// Store
// ============================================================

export const useScenariosStore = create<ScenariosState>((set, get) => ({
  // Scenarios
  scenarios: [],
  
  addScenario: (scenario) => {
    const now = new Date();
    const newScenario: Scenario = {
      ...scenario,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({
      scenarios: [...state.scenarios, newScenario],
    }));
  },

  updateScenario: (id, updates) => {
    set((state) => ({
      scenarios: state.scenarios.map((s) =>
        s.id === id
          ? { ...s, ...updates, updatedAt: new Date() }
          : s
      ),
    }));
  },

  deleteScenario: (id) => {
    set((state) => ({
      scenarios: state.scenarios.filter((s) => s.id !== id),
      selectedScenarioId: state.selectedScenarioId === id ? null : state.selectedScenarioId,
    }));
  },

  duplicateScenario: (id) => {
    const scenario = get().scenarios.find((s) => s.id === id);
    if (!scenario) return;

    const now = new Date();
    const duplicate: Scenario = {
      ...scenario,
      id: crypto.randomUUID(),
      name: `${scenario.name} (Copy)`,
      status: 'draft',
      lastRunId: undefined,
      lastRunAt: undefined,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({
      scenarios: [...state.scenarios, duplicate],
    }));
  },

  // Selection
  selectedScenarioId: null,
  
  selectScenario: (id) => set({ selectedScenarioId: id }),
  
  clearSelection: () => set({ selectedScenarioId: null }),
  
  getSelectedScenario: () => {
    const { scenarios, selectedScenarioId } = get();
    return scenarios.find((s) => s.id === selectedScenarioId) ?? null;
  },

  // Filtering
  searchQuery: '',
  statusFilter: null,

  setSearchQuery: (query) => set({ searchQuery: query }),
  
  setStatusFilter: (status) => set({ statusFilter: status }),
  
  clearFilters: () => set({ searchQuery: '', statusFilter: null }),

  getFilteredScenarios: () => {
    const { scenarios, searchQuery, statusFilter } = get();
    
    return scenarios.filter((scenario) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = scenario.name.toLowerCase().includes(query);
        const matchesDescription = scenario.description.toLowerCase().includes(query);
        const matchesTags = scenario.tags.some((tag) => tag.toLowerCase().includes(query));
        if (!matchesName && !matchesDescription && !matchesTags) {
          return false;
        }
      }

      // Status filter
      if (statusFilter && scenario.status !== statusFilter) {
        return false;
      }

      return true;
    });
  },

  // Editor
  isEditorOpen: false,
  editingScenario: null,

  openEditorForNew: () => set({ isEditorOpen: true, editingScenario: null }),

  openEditorForScenario: (id) => {
    const scenario = get().scenarios.find((s) => s.id === id);
    if (scenario) {
      set({ isEditorOpen: true, editingScenario: scenario });
    }
  },

  closeEditor: () => set({ isEditorOpen: false, editingScenario: null }),

  // Validation
  validateParameters: (params) => {
    const errors: string[] = [];

    if (params.fertility !== undefined && params.fertility < 0) {
      errors.push('Fertility rate must be positive');
    }

    if (params.fertility !== undefined && params.fertility > 10) {
      errors.push('Fertility rate seems unrealistically high');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
}));
