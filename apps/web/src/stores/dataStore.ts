/**
 * Data Store
 * 
 * Manages project data files (CSV, GeoJSON, etc.)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FileType = 'population' | 'mortality' | 'fertility' | 'migration' | 'geojson' | 'unknown';
export type FileStatus = 'ready' | 'processing' | 'error';

export interface DataFile {
  id: string;
  name: string;
  type: FileType;
  size: number;
  status: FileStatus;
  error?: string;
  uploadedAt: string;
  rowCount?: number;
  columns?: string[];
  preview?: string[][]; // First 5 rows for preview
}

interface DataState {
  files: DataFile[];
  selectedFileId: string | null;
  isUploading: boolean;
  uploadProgress: number;
}

interface DataActions {
  addFile: (file: Omit<DataFile, 'id' | 'uploadedAt'>) => string;
  updateFile: (id: string, updates: Partial<DataFile>) => void;
  removeFile: (id: string) => void;
  selectFile: (id: string | null) => void;
  setUploading: (uploading: boolean, progress?: number) => void;
  clearFiles: () => void;
}

const generateId = () => `file_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const detectFileType = (fileName: string): FileType => {
  const name = fileName.toLowerCase();
  if (name.includes('population') || name.includes('pop')) return 'population';
  if (name.includes('mortality') || name.includes('death')) return 'mortality';
  if (name.includes('fertility') || name.includes('birth')) return 'fertility';
  if (name.includes('migration') || name.includes('migr')) return 'migration';
  if (name.endsWith('.geojson') || name.endsWith('.json')) return 'geojson';
  return 'unknown';
};

export const useDataStore = create<DataState & DataActions>()(
  persist(
    (set, get) => ({
      // State
      files: [],
      selectedFileId: null,
      isUploading: false,
      uploadProgress: 0,

      // Actions
      addFile: (file) => {
        const id = generateId();
        const newFile: DataFile = {
          ...file,
          id,
          type: file.type === 'unknown' ? detectFileType(file.name) : file.type,
          uploadedAt: new Date().toISOString(),
        };
        set((state) => ({
          files: [...state.files, newFile],
        }));
        return id;
      },

      updateFile: (id, updates) => {
        set((state) => ({
          files: state.files.map((f) =>
            f.id === id ? { ...f, ...updates } : f
          ),
        }));
      },

      removeFile: (id) => {
        set((state) => ({
          files: state.files.filter((f) => f.id !== id),
          selectedFileId: state.selectedFileId === id ? null : state.selectedFileId,
        }));
      },

      selectFile: (id) => {
        set({ selectedFileId: id });
      },

      setUploading: (uploading, progress = 0) => {
        set({ isUploading: uploading, uploadProgress: progress });
      },

      clearFiles: () => {
        set({ files: [], selectedFileId: null });
      },
    }),
    {
      name: 'popula-data-store',
      partialize: (state) => ({
        files: state.files,
      }),
    }
  )
);

// Selectors
export const selectFiles = (state: DataState) => state.files;
export const selectSelectedFile = (state: DataState & DataActions) => {
  return state.files.find((f) => f.id === state.selectedFileId) ?? null;
};
export const selectFilesByType = (type: FileType) => (state: DataState) => {
  return state.files.filter((f) => f.type === type);
};
