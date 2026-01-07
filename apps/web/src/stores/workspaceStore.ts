/**
 * Workspace Store
 * 
 * Manages workspaces - places where demographic data lives and projections run.
 * Uses Zustand for state management with localStorage persistence.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Workspace,
  WorkspaceSummary,
  PopulationData,
  MortalityData,
  FertilityData,
  MigrationData,
  ProjectionParameters,
  ProjectionState,
  DataImportState,
} from '@popula/shared-types';
import {
  createWorkspace,
  toWorkspaceSummary,
} from '@popula/shared-types';

// ============================================================
// Store State
// ============================================================

interface WorkspaceState {
  // Workspaces indexed by ID
  workspaces: Record<string, Workspace>;
  
  // Currently active workspace ID
  activeWorkspaceId: string | null;
  
  // Actions
  createNewWorkspace: (name: string, description?: string) => string;
  deleteWorkspace: (id: string) => void;
  setActiveWorkspace: (id: string | null) => void;
  renameWorkspace: (id: string, name: string) => void;
  
  // Data import actions
  setPopulationData: (id: string, data: PopulationData, fileName: string) => void;
  setMortalityData: (id: string, data: MortalityData, fileName: string) => void;
  setFertilityData: (id: string, data: FertilityData, fileName: string) => void;
  setMigrationData: (id: string, data: MigrationData, fileName: string) => void;
  setImportError: (id: string, dataType: 'population' | 'mortality' | 'fertility' | 'migration', error: string) => void;
  clearData: (id: string, dataType: 'population' | 'mortality' | 'fertility' | 'migration') => void;
  
  // Projection parameters
  setProjectionParameters: (id: string, params: Partial<ProjectionParameters>) => void;
  
  // Projection state
  setProjectionState: (id: string, state: Partial<ProjectionState>) => void;
  
  // Selectors
  getWorkspace: (id: string) => Workspace | undefined;
  getActiveWorkspace: () => Workspace | undefined;
  getWorkspaceSummaries: () => WorkspaceSummary[];
}

// ============================================================
// Store Implementation
// ============================================================

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: {},
      activeWorkspaceId: null,

      createNewWorkspace: (name: string, description?: string) => {
        const workspace = createWorkspace(name, description);
        set((state) => ({
          workspaces: {
            ...state.workspaces,
            [workspace.id]: workspace,
          },
          activeWorkspaceId: workspace.id,
        }));
        return workspace.id;
      },

      deleteWorkspace: (id: string) => {
        set((state) => {
          const { [id]: deleted, ...remaining } = state.workspaces;
          return {
            workspaces: remaining,
            activeWorkspaceId: state.activeWorkspaceId === id ? null : state.activeWorkspaceId,
          };
        });
      },

      setActiveWorkspace: (id: string | null) => {
        set({ activeWorkspaceId: id });
      },

      renameWorkspace: (id: string, name: string) => {
        set((state) => {
          const workspace = state.workspaces[id];
          if (!workspace) return state;
          
          return {
            workspaces: {
              ...state.workspaces,
              [id]: {
                ...workspace,
                name,
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      setPopulationData: (id: string, data: PopulationData, fileName: string) => {
        set((state) => {
          const workspace = state.workspaces[id];
          if (!workspace) return state;
          
          return {
            workspaces: {
              ...state.workspaces,
              [id]: {
                ...workspace,
                population: data,
                populationImport: {
                  status: 'loaded',
                  fileName,
                  rowCount: data.rows.length,
                },
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      setMortalityData: (id: string, data: MortalityData, fileName: string) => {
        set((state) => {
          const workspace = state.workspaces[id];
          if (!workspace) return state;
          
          return {
            workspaces: {
              ...state.workspaces,
              [id]: {
                ...workspace,
                mortality: data,
                mortalityImport: {
                  status: 'loaded',
                  fileName,
                  rowCount: data.rows.length,
                },
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      setFertilityData: (id: string, data: FertilityData, fileName: string) => {
        set((state) => {
          const workspace = state.workspaces[id];
          if (!workspace) return state;
          
          return {
            workspaces: {
              ...state.workspaces,
              [id]: {
                ...workspace,
                fertility: data,
                fertilityImport: {
                  status: 'loaded',
                  fileName,
                  rowCount: data.rows.length,
                },
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      setMigrationData: (id: string, data: MigrationData, fileName: string) => {
        set((state) => {
          const workspace = state.workspaces[id];
          if (!workspace) return state;
          
          return {
            workspaces: {
              ...state.workspaces,
              [id]: {
                ...workspace,
                migration: data,
                migrationImport: {
                  status: 'loaded',
                  fileName,
                  rowCount: data.rows.length,
                },
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      setImportError: (id: string, dataType, error: string) => {
        set((state) => {
          const workspace = state.workspaces[id];
          if (!workspace) return state;
          
          const importKey = `${dataType}Import` as const;
          
          return {
            workspaces: {
              ...state.workspaces,
              [id]: {
                ...workspace,
                [importKey]: {
                  status: 'error',
                  error,
                } as DataImportState,
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      clearData: (id: string, dataType) => {
        set((state) => {
          const workspace = state.workspaces[id];
          if (!workspace) return state;
          
          const importKey = `${dataType}Import` as const;
          
          return {
            workspaces: {
              ...state.workspaces,
              [id]: {
                ...workspace,
                [dataType]: null,
                [importKey]: { status: 'empty' } as DataImportState,
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      setProjectionParameters: (id: string, params: Partial<ProjectionParameters>) => {
        set((state) => {
          const workspace = state.workspaces[id];
          if (!workspace) return state;
          
          return {
            workspaces: {
              ...state.workspaces,
              [id]: {
                ...workspace,
                parameters: {
                  ...workspace.parameters,
                  ...params,
                },
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      setProjectionState: (id: string, projectionState: Partial<ProjectionState>) => {
        set((state) => {
          const workspace = state.workspaces[id];
          if (!workspace) return state;
          
          return {
            workspaces: {
              ...state.workspaces,
              [id]: {
                ...workspace,
                projection: {
                  ...workspace.projection,
                  ...projectionState,
                },
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      getWorkspace: (id: string) => {
        return get().workspaces[id];
      },

      getActiveWorkspace: () => {
        const { workspaces, activeWorkspaceId } = get();
        return activeWorkspaceId ? workspaces[activeWorkspaceId] : undefined;
      },

      getWorkspaceSummaries: () => {
        return Object.values(get().workspaces)
          .map(toWorkspaceSummary)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      },
    }),
    {
      name: 'popula-workspaces',
      // Only persist workspaces, not computed state
      partialize: (state) => ({
        workspaces: state.workspaces,
        activeWorkspaceId: state.activeWorkspaceId,
      }),
    }
  )
);

