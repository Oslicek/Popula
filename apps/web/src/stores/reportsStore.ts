/**
 * Reports Store - State management for reports and exports
 * 
 * Manages:
 * - Report CRUD operations
 * - Selection and filtering
 * - Report generation workflow
 * - Sharing functionality
 */

import { create } from 'zustand';

// ============================================================
// Types
// ============================================================

export type ReportType = 'pdf' | 'csv' | 'parquet' | 'geojson' | 'pmtiles';
export type ReportStatus = 'generating' | 'ready' | 'failed';

export interface Report {
  id: string;
  name: string;
  description: string;
  type: ReportType;
  status: ReportStatus;
  owner: string;
  runId?: string;
  scenarioId?: string;
  fileSize?: number;
  downloadUrl?: string;
  shareLink?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportsState {
  // Reports
  reports: Report[];
  addReport: (report: Omit<Report, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateReport: (id: string, updates: Partial<Report>) => void;
  deleteReport: (id: string) => void;

  // Selection
  selectedReportId: string | null;
  selectReport: (id: string) => void;
  clearSelection: () => void;
  getSelectedReport: () => Report | null;

  // Filtering
  searchQuery: string;
  typeFilter: ReportType | null;
  statusFilter: ReportStatus | null;
  setSearchQuery: (query: string) => void;
  setTypeFilter: (type: ReportType | null) => void;
  setStatusFilter: (status: ReportStatus | null) => void;
  clearFilters: () => void;
  getFilteredReports: () => Report[];

  // Generation
  isGenerating: boolean;
  setGenerating: (generating: boolean) => void;
  createGeneratingReport: (params: { name: string; type: ReportType; runId?: string; scenarioId?: string }) => string;
  markReportReady: (id: string, params: { fileSize: number; downloadUrl: string }) => void;
  markReportFailed: (id: string, error: string) => void;

  // Sharing
  createShareLink: (id: string) => string;
  revokeShareLink: (id: string) => void;
}

// ============================================================
// Store
// ============================================================

export const useReportsStore = create<ReportsState>((set, get) => ({
  // Reports
  reports: [],
  
  addReport: (report) => {
    const now = new Date();
    const newReport: Report = {
      ...report,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({
      reports: [...state.reports, newReport],
    }));
  },

  updateReport: (id, updates) => {
    set((state) => ({
      reports: state.reports.map((r) =>
        r.id === id
          ? { ...r, ...updates, updatedAt: new Date() }
          : r
      ),
    }));
  },

  deleteReport: (id) => {
    set((state) => ({
      reports: state.reports.filter((r) => r.id !== id),
      selectedReportId: state.selectedReportId === id ? null : state.selectedReportId,
    }));
  },

  // Selection
  selectedReportId: null,
  
  selectReport: (id) => set({ selectedReportId: id }),
  
  clearSelection: () => set({ selectedReportId: null }),
  
  getSelectedReport: () => {
    const { reports, selectedReportId } = get();
    return reports.find((r) => r.id === selectedReportId) ?? null;
  },

  // Filtering
  searchQuery: '',
  typeFilter: null,
  statusFilter: null,

  setSearchQuery: (query) => set({ searchQuery: query }),
  
  setTypeFilter: (type) => set({ typeFilter: type }),
  
  setStatusFilter: (status) => set({ statusFilter: status }),
  
  clearFilters: () => set({ searchQuery: '', typeFilter: null, statusFilter: null }),

  getFilteredReports: () => {
    const { reports, searchQuery, typeFilter, statusFilter } = get();
    
    return reports.filter((report) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = report.name.toLowerCase().includes(query);
        const matchesDescription = report.description.toLowerCase().includes(query);
        if (!matchesName && !matchesDescription) {
          return false;
        }
      }

      // Type filter
      if (typeFilter && report.type !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter && report.status !== statusFilter) {
        return false;
      }

      return true;
    });
  },

  // Generation
  isGenerating: false,
  
  setGenerating: (generating) => set({ isGenerating: generating }),

  createGeneratingReport: (params) => {
    const now = new Date();
    const id = crypto.randomUUID();
    const newReport: Report = {
      id,
      name: params.name,
      description: '',
      type: params.type,
      status: 'generating',
      owner: 'user',
      runId: params.runId,
      scenarioId: params.scenarioId,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({
      reports: [...state.reports, newReport],
      isGenerating: true,
    }));
    return id;
  },

  markReportReady: (id, params) => {
    set((state) => ({
      reports: state.reports.map((r) =>
        r.id === id
          ? { 
              ...r, 
              status: 'ready' as ReportStatus, 
              fileSize: params.fileSize, 
              downloadUrl: params.downloadUrl,
              updatedAt: new Date(),
            }
          : r
      ),
      isGenerating: false,
    }));
  },

  markReportFailed: (id, error) => {
    set((state) => ({
      reports: state.reports.map((r) =>
        r.id === id
          ? { 
              ...r, 
              status: 'failed' as ReportStatus, 
              error,
              updatedAt: new Date(),
            }
          : r
      ),
      isGenerating: false,
    }));
  },

  // Sharing
  createShareLink: (id) => {
    const shareLink = `${window.location.origin}/shared/reports/${id}`;
    set((state) => ({
      reports: state.reports.map((r) =>
        r.id === id
          ? { ...r, shareLink, updatedAt: new Date() }
          : r
      ),
    }));
    return shareLink;
  },

  revokeShareLink: (id) => {
    set((state) => ({
      reports: state.reports.map((r) =>
        r.id === id
          ? { ...r, shareLink: undefined, updatedAt: new Date() }
          : r
      ),
    }));
  },
}));
