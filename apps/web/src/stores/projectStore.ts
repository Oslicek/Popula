/**
 * Project Store
 * 
 * Manages projects - places where demographic data lives and projections run.
 * This is a re-export of workspaceStore with Project terminology.
 * 
 * Note: "Project" and "Workspace" are synonymous. This file provides
 * the new naming convention while maintaining backward compatibility.
 */

import { useWorkspaceStore } from './workspaceStore';
import type {
  Project,
  ProjectSummary,
  PopulationData,
  MortalityData,
  FertilityData,
  MigrationData,
  ProjectionParameters,
  ProjectionState,
  DataImportState,
} from '@popula/shared-types';
import {
  createProject,
  toProjectSummary,
} from '@popula/shared-types';

// Re-export types with Project naming
export type {
  Project,
  ProjectSummary,
  PopulationData,
  MortalityData,
  FertilityData,
  MigrationData,
  ProjectionParameters,
  ProjectionState,
  DataImportState,
};

// ============================================================
// Project Store Interface
// ============================================================

export interface ProjectState {
  // Projects indexed by ID
  projects: Record<string, Project>;
  
  // Currently active project ID
  activeProjectId: string | null;
  
  // Actions
  createNewProject: (name: string, description?: string) => string;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  renameProject: (id: string, name: string) => void;
  
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
  getProject: (id: string) => Project | undefined;
  getActiveProject: () => Project | undefined;
  getProjectSummaries: () => ProjectSummary[];
}

// ============================================================
// Project Store (wraps Workspace Store)
// ============================================================

/**
 * useProjectStore - The main store for managing projects
 * 
 * This is a thin wrapper over useWorkspaceStore that:
 * 1. Uses "Project" terminology instead of "Workspace"
 * 2. Maintains full backward compatibility
 * 3. Shares the same underlying localStorage persistence
 */
export const useProjectStore = (): ProjectState => {
  const store = useWorkspaceStore();
  
  return {
    // Map workspaces -> projects
    projects: store.workspaces,
    activeProjectId: store.activeWorkspaceId,
    
    // Rename actions
    createNewProject: store.createNewWorkspace,
    deleteProject: store.deleteWorkspace,
    setActiveProject: store.setActiveWorkspace,
    renameProject: store.renameWorkspace,
    
    // Data actions (same names)
    setPopulationData: store.setPopulationData,
    setMortalityData: store.setMortalityData,
    setFertilityData: store.setFertilityData,
    setMigrationData: store.setMigrationData,
    setImportError: store.setImportError,
    clearData: store.clearData,
    
    // Projection actions (same names)
    setProjectionParameters: store.setProjectionParameters,
    setProjectionState: store.setProjectionState,
    
    // Rename selectors
    getProject: store.getWorkspace,
    getActiveProject: store.getActiveWorkspace,
    getProjectSummaries: () => {
      return store.getWorkspaceSummaries().map(ws => ({
        ...ws,
      })) as ProjectSummary[];
    },
  };
};

// ============================================================
// Direct store access (for non-React contexts)
// ============================================================

/**
 * Get project store state directly (non-hook version)
 */
export const getProjectStoreState = (): ProjectState => {
  const store = useWorkspaceStore.getState();
  
  return {
    projects: store.workspaces,
    activeProjectId: store.activeWorkspaceId,
    createNewProject: store.createNewWorkspace,
    deleteProject: store.deleteWorkspace,
    setActiveProject: store.setActiveWorkspace,
    renameProject: store.renameWorkspace,
    setPopulationData: store.setPopulationData,
    setMortalityData: store.setMortalityData,
    setFertilityData: store.setFertilityData,
    setMigrationData: store.setMigrationData,
    setImportError: store.setImportError,
    clearData: store.clearData,
    setProjectionParameters: store.setProjectionParameters,
    setProjectionState: store.setProjectionState,
    getProject: store.getWorkspace,
    getActiveProject: store.getActiveWorkspace,
    getProjectSummaries: () => store.getWorkspaceSummaries() as ProjectSummary[],
  };
};

// Re-export helper functions
export { createProject, toProjectSummary };
