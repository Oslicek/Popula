/**
 * Data Store Tests (TDD)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useDataStore } from './dataStore';

describe('dataStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useDataStore.setState({
      files: [],
      selectedFileId: null,
      isUploading: false,
      uploadProgress: 0,
    });
  });

  describe('addFile', () => {
    it('adds a file with generated id', () => {
      const store = useDataStore.getState();
      const id = store.addFile({
        name: 'population.csv',
        type: 'population',
        size: 1024,
        status: 'ready',
      });

      expect(id).toMatch(/^file_/);
      expect(useDataStore.getState().files).toHaveLength(1);
      expect(useDataStore.getState().files[0].name).toBe('population.csv');
    });

    it('sets uploadedAt timestamp', () => {
      const store = useDataStore.getState();
      store.addFile({
        name: 'test.csv',
        type: 'unknown',
        size: 100,
        status: 'ready',
      });

      const file = useDataStore.getState().files[0];
      expect(file.uploadedAt).toBeDefined();
      expect(new Date(file.uploadedAt).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('auto-detects file type from name', () => {
      const store = useDataStore.getState();
      
      store.addFile({ name: 'population_2024.csv', type: 'unknown', size: 100, status: 'ready' });
      store.addFile({ name: 'mortality_rates.csv', type: 'unknown', size: 100, status: 'ready' });
      store.addFile({ name: 'fertility_data.csv', type: 'unknown', size: 100, status: 'ready' });
      store.addFile({ name: 'migration.csv', type: 'unknown', size: 100, status: 'ready' });
      store.addFile({ name: 'regions.geojson', type: 'unknown', size: 100, status: 'ready' });

      const files = useDataStore.getState().files;
      expect(files[0].type).toBe('population');
      expect(files[1].type).toBe('mortality');
      expect(files[2].type).toBe('fertility');
      expect(files[3].type).toBe('migration');
      expect(files[4].type).toBe('geojson');
    });
  });

  describe('updateFile', () => {
    it('updates file properties', () => {
      const store = useDataStore.getState();
      const id = store.addFile({
        name: 'test.csv',
        type: 'unknown',
        size: 100,
        status: 'processing',
      });

      store.updateFile(id, { status: 'ready', rowCount: 50 });

      const file = useDataStore.getState().files.find((f) => f.id === id);
      expect(file?.status).toBe('ready');
      expect(file?.rowCount).toBe(50);
    });

    it('only updates specified properties', () => {
      const store = useDataStore.getState();
      const id = store.addFile({
        name: 'test.csv',
        type: 'population',
        size: 100,
        status: 'ready',
      });

      store.updateFile(id, { rowCount: 100 });

      const file = useDataStore.getState().files.find((f) => f.id === id);
      expect(file?.name).toBe('test.csv');
      expect(file?.type).toBe('population');
      expect(file?.rowCount).toBe(100);
    });
  });

  describe('removeFile', () => {
    it('removes file by id', () => {
      const store = useDataStore.getState();
      const id = store.addFile({
        name: 'test.csv',
        type: 'unknown',
        size: 100,
        status: 'ready',
      });

      expect(useDataStore.getState().files).toHaveLength(1);
      
      store.removeFile(id);
      
      expect(useDataStore.getState().files).toHaveLength(0);
    });

    it('clears selection if selected file is removed', () => {
      const store = useDataStore.getState();
      const id = store.addFile({
        name: 'test.csv',
        type: 'unknown',
        size: 100,
        status: 'ready',
      });

      store.selectFile(id);
      expect(useDataStore.getState().selectedFileId).toBe(id);

      store.removeFile(id);
      expect(useDataStore.getState().selectedFileId).toBeNull();
    });
  });

  describe('selectFile', () => {
    it('sets selected file id', () => {
      const store = useDataStore.getState();
      const id = store.addFile({
        name: 'test.csv',
        type: 'unknown',
        size: 100,
        status: 'ready',
      });

      store.selectFile(id);
      expect(useDataStore.getState().selectedFileId).toBe(id);
    });

    it('can clear selection with null', () => {
      const store = useDataStore.getState();
      const id = store.addFile({
        name: 'test.csv',
        type: 'unknown',
        size: 100,
        status: 'ready',
      });

      store.selectFile(id);
      store.selectFile(null);
      expect(useDataStore.getState().selectedFileId).toBeNull();
    });
  });

  describe('setUploading', () => {
    it('sets uploading state', () => {
      const store = useDataStore.getState();
      
      store.setUploading(true, 50);
      
      expect(useDataStore.getState().isUploading).toBe(true);
      expect(useDataStore.getState().uploadProgress).toBe(50);
    });

    it('defaults progress to 0', () => {
      const store = useDataStore.getState();
      
      store.setUploading(true);
      
      expect(useDataStore.getState().uploadProgress).toBe(0);
    });
  });

  describe('clearFiles', () => {
    it('removes all files and clears selection', () => {
      const store = useDataStore.getState();
      store.addFile({ name: 'file1.csv', type: 'unknown', size: 100, status: 'ready' });
      store.addFile({ name: 'file2.csv', type: 'unknown', size: 100, status: 'ready' });
      const id = store.addFile({ name: 'file3.csv', type: 'unknown', size: 100, status: 'ready' });
      store.selectFile(id);

      store.clearFiles();

      expect(useDataStore.getState().files).toHaveLength(0);
      expect(useDataStore.getState().selectedFileId).toBeNull();
    });
  });
});
