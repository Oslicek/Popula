import { describe, it, expect, beforeEach } from 'vitest';
import { useScenariosStore, type Scenario, ScenarioStatus } from './scenariosStore';

describe('scenariosStore', () => {
  beforeEach(() => {
    useScenariosStore.setState({
      scenarios: [],
      selectedScenarioId: null,
      searchQuery: '',
      statusFilter: null,
      isEditorOpen: false,
      editingScenario: null,
    });
  });

  describe('scenarios management', () => {
    it('starts with empty scenarios', () => {
      expect(useScenariosStore.getState().scenarios).toHaveLength(0);
    });

    it('adds a scenario', () => {
      const { addScenario } = useScenariosStore.getState();
      const scenario: Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'Base Scenario',
        description: 'Default projection',
        status: 'draft',
        owner: 'user1',
        parameters: {
          fertility: 1.8,
          mortality: 'medium',
          migration: 'baseline',
        },
        tags: ['default'],
      };
      
      addScenario(scenario);
      
      const scenarios = useScenariosStore.getState().scenarios;
      expect(scenarios).toHaveLength(1);
      expect(scenarios[0].name).toBe('Base Scenario');
      expect(scenarios[0].id).toBeDefined();
      expect(scenarios[0].createdAt).toBeDefined();
    });

    it('updates a scenario', () => {
      const { addScenario, updateScenario } = useScenariosStore.getState();
      addScenario({
        name: 'Test Scenario',
        description: '',
        status: 'draft',
        owner: 'user1',
        parameters: {},
        tags: [],
      });
      
      const id = useScenariosStore.getState().scenarios[0].id;
      updateScenario(id, { name: 'Updated Scenario', status: 'published' });
      
      const scenario = useScenariosStore.getState().scenarios[0];
      expect(scenario.name).toBe('Updated Scenario');
      expect(scenario.status).toBe('published');
    });

    it('deletes a scenario', () => {
      const { addScenario, deleteScenario } = useScenariosStore.getState();
      addScenario({
        name: 'To Delete',
        description: '',
        status: 'draft',
        owner: 'user1',
        parameters: {},
        tags: [],
      });
      
      const id = useScenariosStore.getState().scenarios[0].id;
      deleteScenario(id);
      
      expect(useScenariosStore.getState().scenarios).toHaveLength(0);
    });

    it('duplicates a scenario', () => {
      const { addScenario, duplicateScenario } = useScenariosStore.getState();
      addScenario({
        name: 'Original',
        description: 'Original description',
        status: 'published',
        owner: 'user1',
        parameters: { fertility: 1.8 },
        tags: ['original'],
      });
      
      const id = useScenariosStore.getState().scenarios[0].id;
      duplicateScenario(id);
      
      const scenarios = useScenariosStore.getState().scenarios;
      expect(scenarios).toHaveLength(2);
      expect(scenarios[1].name).toBe('Original (Copy)');
      expect(scenarios[1].status).toBe('draft');
      expect(scenarios[1].parameters.fertility).toBe(1.8);
    });
  });

  describe('selection', () => {
    it('starts with no selection', () => {
      expect(useScenariosStore.getState().selectedScenarioId).toBeNull();
    });

    it('selects a scenario', () => {
      const { addScenario, selectScenario } = useScenariosStore.getState();
      addScenario({
        name: 'Test',
        description: '',
        status: 'draft',
        owner: 'user1',
        parameters: {},
        tags: [],
      });
      
      const id = useScenariosStore.getState().scenarios[0].id;
      selectScenario(id);
      
      expect(useScenariosStore.getState().selectedScenarioId).toBe(id);
    });

    it('clears selection', () => {
      useScenariosStore.setState({ selectedScenarioId: 'some-id' });
      const { clearSelection } = useScenariosStore.getState();
      clearSelection();
      
      expect(useScenariosStore.getState().selectedScenarioId).toBeNull();
    });

    it('getSelectedScenario returns the selected scenario', () => {
      const { addScenario, selectScenario, getSelectedScenario } = useScenariosStore.getState();
      addScenario({
        name: 'Selected One',
        description: '',
        status: 'draft',
        owner: 'user1',
        parameters: {},
        tags: [],
      });
      
      const id = useScenariosStore.getState().scenarios[0].id;
      selectScenario(id);
      
      const selected = useScenariosStore.getState().getSelectedScenario();
      expect(selected?.name).toBe('Selected One');
    });
  });

  describe('filtering', () => {
    beforeEach(() => {
      const { addScenario } = useScenariosStore.getState();
      addScenario({
        name: 'High Growth',
        description: 'Optimistic scenario',
        status: 'published',
        owner: 'user1',
        parameters: {},
        tags: ['optimistic'],
      });
      addScenario({
        name: 'Low Growth',
        description: 'Pessimistic scenario',
        status: 'draft',
        owner: 'user1',
        parameters: {},
        tags: ['pessimistic'],
      });
      addScenario({
        name: 'Baseline',
        description: 'Default projection',
        status: 'published',
        owner: 'user2',
        parameters: {},
        tags: ['default'],
      });
    });

    it('filters by search query', () => {
      const { setSearchQuery, getFilteredScenarios } = useScenariosStore.getState();
      setSearchQuery('growth');
      
      const filtered = useScenariosStore.getState().getFilteredScenarios();
      expect(filtered).toHaveLength(2);
    });

    it('filters by status', () => {
      const { setStatusFilter, getFilteredScenarios } = useScenariosStore.getState();
      setStatusFilter('published');
      
      const filtered = useScenariosStore.getState().getFilteredScenarios();
      expect(filtered).toHaveLength(2);
      expect(filtered.every(s => s.status === 'published')).toBe(true);
    });

    it('combines search and status filters', () => {
      const { setSearchQuery, setStatusFilter, getFilteredScenarios } = useScenariosStore.getState();
      setSearchQuery('growth');
      setStatusFilter('draft');
      
      const filtered = useScenariosStore.getState().getFilteredScenarios();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Low Growth');
    });

    it('clears filters', () => {
      const { setSearchQuery, setStatusFilter, clearFilters, getFilteredScenarios } = useScenariosStore.getState();
      setSearchQuery('growth');
      setStatusFilter('draft');
      clearFilters();
      
      const filtered = useScenariosStore.getState().getFilteredScenarios();
      expect(filtered).toHaveLength(3);
    });
  });

  describe('editor', () => {
    it('starts with editor closed', () => {
      expect(useScenariosStore.getState().isEditorOpen).toBe(false);
      expect(useScenariosStore.getState().editingScenario).toBeNull();
    });

    it('opens editor for new scenario', () => {
      const { openEditorForNew } = useScenariosStore.getState();
      openEditorForNew();
      
      expect(useScenariosStore.getState().isEditorOpen).toBe(true);
      expect(useScenariosStore.getState().editingScenario).toBeNull();
    });

    it('opens editor for existing scenario', () => {
      const { addScenario, openEditorForScenario } = useScenariosStore.getState();
      addScenario({
        name: 'Edit Me',
        description: '',
        status: 'draft',
        owner: 'user1',
        parameters: {},
        tags: [],
      });
      
      const id = useScenariosStore.getState().scenarios[0].id;
      openEditorForScenario(id);
      
      expect(useScenariosStore.getState().isEditorOpen).toBe(true);
      expect(useScenariosStore.getState().editingScenario?.name).toBe('Edit Me');
    });

    it('closes editor', () => {
      useScenariosStore.setState({ isEditorOpen: true, editingScenario: {} as Scenario });
      const { closeEditor } = useScenariosStore.getState();
      closeEditor();
      
      expect(useScenariosStore.getState().isEditorOpen).toBe(false);
      expect(useScenariosStore.getState().editingScenario).toBeNull();
    });
  });

  describe('scenario parameters', () => {
    it('validates parameter ranges', () => {
      const { validateParameters } = useScenariosStore.getState();
      
      const valid = validateParameters({
        fertility: 1.8,
        mortality: 'medium',
        migration: 'baseline',
      });
      expect(valid.isValid).toBe(true);
      
      const invalid = validateParameters({
        fertility: -1,
        mortality: 'medium',
        migration: 'baseline',
      });
      expect(invalid.isValid).toBe(false);
      expect(invalid.errors).toContain('Fertility rate must be positive');
    });
  });
});
