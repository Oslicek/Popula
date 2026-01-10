/**
 * Runs Store Tests (TDD)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useRunsStore } from './runsStore';

describe('runsStore', () => {
  beforeEach(() => {
    useRunsStore.setState({
      runs: [],
      selectedRunIds: [],
      filter: { type: 'all', status: 'all' },
    });
  });

  describe('addRun', () => {
    it('adds a run with generated id and timestamp', () => {
      const store = useRunsStore.getState();
      const id = store.addRun({
        type: 'projection',
        status: 'queued',
        name: 'Test Projection',
      });

      expect(id).toMatch(/^run_/);
      expect(useRunsStore.getState().runs).toHaveLength(1);
      const run = useRunsStore.getState().runs[0];
      expect(run.name).toBe('Test Projection');
      expect(run.createdAt).toBeDefined();
    });

    it('adds new runs at the beginning (most recent first)', () => {
      const store = useRunsStore.getState();
      store.addRun({ type: 'projection', status: 'done', name: 'First' });
      store.addRun({ type: 'projection', status: 'queued', name: 'Second' });

      const runs = useRunsStore.getState().runs;
      expect(runs[0].name).toBe('Second');
      expect(runs[1].name).toBe('First');
    });
  });

  describe('updateRun', () => {
    it('updates run properties', () => {
      const store = useRunsStore.getState();
      const id = store.addRun({
        type: 'projection',
        status: 'queued',
        name: 'Test',
      });

      store.updateRun(id, {
        status: 'running',
        startedAt: '2026-01-10T12:00:00Z',
      });

      const run = useRunsStore.getState().runs.find((r) => r.id === id);
      expect(run?.status).toBe('running');
      expect(run?.startedAt).toBe('2026-01-10T12:00:00Z');
    });

    it('preserves other properties when updating', () => {
      const store = useRunsStore.getState();
      const id = store.addRun({
        type: 'projection',
        status: 'queued',
        name: 'Original Name',
        baseYear: 2024,
      });

      store.updateRun(id, { status: 'running' });

      const run = useRunsStore.getState().runs.find((r) => r.id === id);
      expect(run?.name).toBe('Original Name');
      expect(run?.baseYear).toBe(2024);
    });
  });

  describe('removeRun', () => {
    it('removes run by id', () => {
      const store = useRunsStore.getState();
      const id = store.addRun({ type: 'projection', status: 'done', name: 'Test' });

      expect(useRunsStore.getState().runs).toHaveLength(1);

      store.removeRun(id);

      expect(useRunsStore.getState().runs).toHaveLength(0);
    });

    it('removes from selection if selected', () => {
      const store = useRunsStore.getState();
      const id = store.addRun({ type: 'projection', status: 'done', name: 'Test' });
      store.selectRun(id);

      expect(useRunsStore.getState().selectedRunIds).toContain(id);

      store.removeRun(id);

      expect(useRunsStore.getState().selectedRunIds).not.toContain(id);
    });
  });

  describe('selectRun', () => {
    it('adds run to selection', () => {
      const store = useRunsStore.getState();
      const id = store.addRun({ type: 'projection', status: 'done', name: 'Test' });

      store.selectRun(id);

      expect(useRunsStore.getState().selectedRunIds).toContain(id);
    });

    it('does not duplicate selection', () => {
      const store = useRunsStore.getState();
      const id = store.addRun({ type: 'projection', status: 'done', name: 'Test' });

      store.selectRun(id);
      store.selectRun(id);

      expect(useRunsStore.getState().selectedRunIds.filter((sid) => sid === id)).toHaveLength(1);
    });

    it('limits selection to 4 runs', () => {
      const store = useRunsStore.getState();
      const ids = Array.from({ length: 5 }, (_, i) =>
        store.addRun({ type: 'projection', status: 'done', name: `Run ${i}` })
      );

      ids.forEach((id) => store.selectRun(id));

      expect(useRunsStore.getState().selectedRunIds).toHaveLength(4);
      // First one should be removed when 5th is added
      expect(useRunsStore.getState().selectedRunIds).not.toContain(ids[0]);
    });
  });

  describe('deselectRun', () => {
    it('removes run from selection', () => {
      const store = useRunsStore.getState();
      const id = store.addRun({ type: 'projection', status: 'done', name: 'Test' });

      store.selectRun(id);
      expect(useRunsStore.getState().selectedRunIds).toContain(id);

      store.deselectRun(id);
      expect(useRunsStore.getState().selectedRunIds).not.toContain(id);
    });
  });

  describe('toggleRunSelection', () => {
    it('toggles selection state', () => {
      const store = useRunsStore.getState();
      const id = store.addRun({ type: 'projection', status: 'done', name: 'Test' });

      store.toggleRunSelection(id);
      expect(useRunsStore.getState().selectedRunIds).toContain(id);

      store.toggleRunSelection(id);
      expect(useRunsStore.getState().selectedRunIds).not.toContain(id);
    });
  });

  describe('clearSelection', () => {
    it('clears all selections', () => {
      const store = useRunsStore.getState();
      const ids = Array.from({ length: 3 }, (_, i) =>
        store.addRun({ type: 'projection', status: 'done', name: `Run ${i}` })
      );

      ids.forEach((id) => store.selectRun(id));
      expect(useRunsStore.getState().selectedRunIds).toHaveLength(3);

      store.clearSelection();
      expect(useRunsStore.getState().selectedRunIds).toHaveLength(0);
    });
  });

  describe('setFilter', () => {
    it('sets type filter', () => {
      const store = useRunsStore.getState();
      store.setFilter({ type: 'projection' });

      expect(useRunsStore.getState().filter.type).toBe('projection');
      expect(useRunsStore.getState().filter.status).toBe('all'); // Unchanged
    });

    it('sets status filter', () => {
      const store = useRunsStore.getState();
      store.setFilter({ status: 'running' });

      expect(useRunsStore.getState().filter.status).toBe('running');
      expect(useRunsStore.getState().filter.type).toBe('all'); // Unchanged
    });

    it('sets multiple filters at once', () => {
      const store = useRunsStore.getState();
      store.setFilter({ type: 'data_job', status: 'failed' });

      expect(useRunsStore.getState().filter.type).toBe('data_job');
      expect(useRunsStore.getState().filter.status).toBe('failed');
    });
  });

  describe('getRunById', () => {
    it('returns run by id', () => {
      const store = useRunsStore.getState();
      const id = store.addRun({ type: 'projection', status: 'done', name: 'Test' });

      const run = store.getRunById(id);
      expect(run?.name).toBe('Test');
    });

    it('returns undefined for non-existent id', () => {
      const store = useRunsStore.getState();
      const run = store.getRunById('non-existent');
      expect(run).toBeUndefined();
    });
  });

  describe('getFilteredRuns', () => {
    it('returns all runs when no filter', () => {
      const store = useRunsStore.getState();
      store.addRun({ type: 'projection', status: 'done', name: 'Proj 1' });
      store.addRun({ type: 'data_job', status: 'running', name: 'Job 1' });

      const filtered = store.getFilteredRuns();
      expect(filtered).toHaveLength(2);
    });

    it('filters by type', () => {
      const store = useRunsStore.getState();
      store.addRun({ type: 'projection', status: 'done', name: 'Proj 1' });
      store.addRun({ type: 'data_job', status: 'done', name: 'Job 1' });

      store.setFilter({ type: 'projection' });
      const filtered = store.getFilteredRuns();
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Proj 1');
    });

    it('filters by status', () => {
      const store = useRunsStore.getState();
      store.addRun({ type: 'projection', status: 'done', name: 'Done' });
      store.addRun({ type: 'projection', status: 'running', name: 'Running' });

      store.setFilter({ status: 'running' });
      const filtered = store.getFilteredRuns();

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Running');
    });

    it('combines type and status filters', () => {
      const store = useRunsStore.getState();
      store.addRun({ type: 'projection', status: 'done', name: 'Proj Done' });
      store.addRun({ type: 'projection', status: 'running', name: 'Proj Running' });
      store.addRun({ type: 'data_job', status: 'done', name: 'Job Done' });

      store.setFilter({ type: 'projection', status: 'done' });
      const filtered = store.getFilteredRuns();

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Proj Done');
    });
  });

  describe('clearCompletedRuns', () => {
    it('removes done and failed runs', () => {
      const store = useRunsStore.getState();
      store.addRun({ type: 'projection', status: 'queued', name: 'Queued' });
      store.addRun({ type: 'projection', status: 'running', name: 'Running' });
      store.addRun({ type: 'projection', status: 'done', name: 'Done' });
      store.addRun({ type: 'projection', status: 'failed', name: 'Failed' });

      expect(useRunsStore.getState().runs).toHaveLength(4);

      store.clearCompletedRuns();

      const runs = useRunsStore.getState().runs;
      expect(runs).toHaveLength(2);
      expect(runs.map((r) => r.name)).toContain('Queued');
      expect(runs.map((r) => r.name)).toContain('Running');
    });
  });
});
