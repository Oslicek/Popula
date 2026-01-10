import { describe, it, expect, beforeEach } from 'vitest';
import { useReportsStore, type Report, ReportStatus, ReportType } from './reportsStore';

describe('reportsStore', () => {
  beforeEach(() => {
    useReportsStore.setState({
      reports: [],
      selectedReportId: null,
      searchQuery: '',
      typeFilter: null,
      statusFilter: null,
      isGenerating: false,
    });
  });

  describe('reports management', () => {
    it('starts with empty reports', () => {
      expect(useReportsStore.getState().reports).toHaveLength(0);
    });

    it('adds a report', () => {
      const { addReport } = useReportsStore.getState();
      addReport({
        name: 'Q1 Population Report',
        description: 'Quarterly population analysis',
        type: 'pdf',
        status: 'ready',
        runId: 'run-123',
        scenarioId: 'scenario-456',
        owner: 'user1',
        fileSize: 1024000,
        downloadUrl: '/reports/q1-report.pdf',
      });
      
      const reports = useReportsStore.getState().reports;
      expect(reports).toHaveLength(1);
      expect(reports[0].name).toBe('Q1 Population Report');
      expect(reports[0].id).toBeDefined();
      expect(reports[0].createdAt).toBeDefined();
    });

    it('updates a report', () => {
      const { addReport, updateReport } = useReportsStore.getState();
      addReport({
        name: 'Test Report',
        description: '',
        type: 'csv',
        status: 'generating',
        owner: 'user1',
      });
      
      const id = useReportsStore.getState().reports[0].id;
      updateReport(id, { status: 'ready', fileSize: 5000 });
      
      const report = useReportsStore.getState().reports[0];
      expect(report.status).toBe('ready');
      expect(report.fileSize).toBe(5000);
    });

    it('deletes a report', () => {
      const { addReport, deleteReport } = useReportsStore.getState();
      addReport({
        name: 'To Delete',
        description: '',
        type: 'csv',
        status: 'ready',
        owner: 'user1',
      });
      
      const id = useReportsStore.getState().reports[0].id;
      deleteReport(id);
      
      expect(useReportsStore.getState().reports).toHaveLength(0);
    });
  });

  describe('selection', () => {
    it('starts with no selection', () => {
      expect(useReportsStore.getState().selectedReportId).toBeNull();
    });

    it('selects a report', () => {
      const { addReport, selectReport } = useReportsStore.getState();
      addReport({
        name: 'Test',
        description: '',
        type: 'pdf',
        status: 'ready',
        owner: 'user1',
      });
      
      const id = useReportsStore.getState().reports[0].id;
      selectReport(id);
      
      expect(useReportsStore.getState().selectedReportId).toBe(id);
    });

    it('clears selection', () => {
      useReportsStore.setState({ selectedReportId: 'some-id' });
      const { clearSelection } = useReportsStore.getState();
      clearSelection();
      
      expect(useReportsStore.getState().selectedReportId).toBeNull();
    });

    it('getSelectedReport returns the selected report', () => {
      const { addReport, selectReport, getSelectedReport } = useReportsStore.getState();
      addReport({
        name: 'Selected Report',
        description: '',
        type: 'pdf',
        status: 'ready',
        owner: 'user1',
      });
      
      const id = useReportsStore.getState().reports[0].id;
      selectReport(id);
      
      const selected = useReportsStore.getState().getSelectedReport();
      expect(selected?.name).toBe('Selected Report');
    });
  });

  describe('filtering', () => {
    beforeEach(() => {
      const { addReport } = useReportsStore.getState();
      addReport({
        name: 'Population PDF',
        description: 'PDF report',
        type: 'pdf',
        status: 'ready',
        owner: 'user1',
      });
      addReport({
        name: 'Data Export CSV',
        description: 'CSV export',
        type: 'csv',
        status: 'ready',
        owner: 'user1',
      });
      addReport({
        name: 'GeoJSON Boundaries',
        description: 'Geographic data',
        type: 'geojson',
        status: 'generating',
        owner: 'user2',
      });
    });

    it('filters by search query', () => {
      const { setSearchQuery, getFilteredReports } = useReportsStore.getState();
      setSearchQuery('population');
      
      const filtered = useReportsStore.getState().getFilteredReports();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Population PDF');
    });

    it('filters by type', () => {
      const { setTypeFilter, getFilteredReports } = useReportsStore.getState();
      setTypeFilter('csv');
      
      const filtered = useReportsStore.getState().getFilteredReports();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('csv');
    });

    it('filters by status', () => {
      const { setStatusFilter, getFilteredReports } = useReportsStore.getState();
      setStatusFilter('generating');
      
      const filtered = useReportsStore.getState().getFilteredReports();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].status).toBe('generating');
    });

    it('combines multiple filters', () => {
      const { setSearchQuery, setStatusFilter, getFilteredReports } = useReportsStore.getState();
      setSearchQuery('data');
      setStatusFilter('ready');
      
      const filtered = useReportsStore.getState().getFilteredReports();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Data Export CSV');
    });

    it('clears filters', () => {
      const { setSearchQuery, setTypeFilter, clearFilters, getFilteredReports } = useReportsStore.getState();
      setSearchQuery('test');
      setTypeFilter('pdf');
      clearFilters();
      
      const filtered = useReportsStore.getState().getFilteredReports();
      expect(filtered).toHaveLength(3);
    });
  });

  describe('report generation', () => {
    it('tracks generating state', () => {
      expect(useReportsStore.getState().isGenerating).toBe(false);
      
      const { setGenerating } = useReportsStore.getState();
      setGenerating(true);
      expect(useReportsStore.getState().isGenerating).toBe(true);
      
      setGenerating(false);
      expect(useReportsStore.getState().isGenerating).toBe(false);
    });

    it('creates a generating report', () => {
      const { createGeneratingReport } = useReportsStore.getState();
      const id = createGeneratingReport({
        name: 'New Report',
        type: 'pdf',
        runId: 'run-123',
      });
      
      const report = useReportsStore.getState().reports.find(r => r.id === id);
      expect(report).toBeDefined();
      expect(report?.status).toBe('generating');
      expect(useReportsStore.getState().isGenerating).toBe(true);
    });

    it('marks report as ready', () => {
      const { createGeneratingReport, markReportReady } = useReportsStore.getState();
      const id = createGeneratingReport({
        name: 'New Report',
        type: 'pdf',
      });
      
      markReportReady(id, {
        fileSize: 10000,
        downloadUrl: '/reports/new-report.pdf',
      });
      
      const report = useReportsStore.getState().reports.find(r => r.id === id);
      expect(report?.status).toBe('ready');
      expect(report?.fileSize).toBe(10000);
      expect(useReportsStore.getState().isGenerating).toBe(false);
    });

    it('marks report as failed', () => {
      const { createGeneratingReport, markReportFailed } = useReportsStore.getState();
      const id = createGeneratingReport({
        name: 'New Report',
        type: 'pdf',
      });
      
      markReportFailed(id, 'Generation failed');
      
      const report = useReportsStore.getState().reports.find(r => r.id === id);
      expect(report?.status).toBe('failed');
      expect(report?.error).toBe('Generation failed');
      expect(useReportsStore.getState().isGenerating).toBe(false);
    });
  });

  describe('sharing', () => {
    it('creates a share link', () => {
      const { addReport, createShareLink } = useReportsStore.getState();
      addReport({
        name: 'Shared Report',
        description: '',
        type: 'pdf',
        status: 'ready',
        owner: 'user1',
      });
      
      const id = useReportsStore.getState().reports[0].id;
      const shareLink = createShareLink(id);
      
      expect(shareLink).toContain(id);
      const report = useReportsStore.getState().reports[0];
      expect(report.shareLink).toBeDefined();
    });

    it('revokes a share link', () => {
      const { addReport, createShareLink, revokeShareLink } = useReportsStore.getState();
      addReport({
        name: 'Shared Report',
        description: '',
        type: 'pdf',
        status: 'ready',
        owner: 'user1',
      });
      
      const id = useReportsStore.getState().reports[0].id;
      createShareLink(id);
      revokeShareLink(id);
      
      const report = useReportsStore.getState().reports[0];
      expect(report.shareLink).toBeUndefined();
    });
  });
});
