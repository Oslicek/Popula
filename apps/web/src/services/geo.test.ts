import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeoService } from './geo';
import type { NatsService } from './nats';
import type { GeoProcessRequest, GeoProcessResponse, GeoProcessError } from '@popula/shared-types';

describe('GeoService', () => {
  let mockNatsService: NatsService;
  let geoService: GeoService;

  beforeEach(() => {
    mockNatsService = {
      request: vi.fn(),
    } as unknown as NatsService;
    geoService = new GeoService(mockNatsService);
  });

  describe('processVfrXml', () => {
    it('should send VFR XML to worker and return processed GeoJSON', async () => {
      const xmlContent = '<test>xml</test>';
      const mockResponse: GeoProcessResponse = {
        geojson: {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [15.0, 50.0] },
            properties: { uzemi_kod: '123', area_sq_m: 1000 },
          }],
        },
        metadata: {
          featureCount: 1,
          bbox: [15, 50, 15, 50],
          processingTimeMs: 100,
          sourceCrs: 'EPSG:5514',
          targetCrs: 'EPSG:4326',
        },
      };

      vi.mocked(mockNatsService.request).mockResolvedValue({
        id: 'msg-1',
        timestamp: '2024-01-01T00:00:00Z',
        correlationId: 'corr-1',
        payload: mockResponse,
      });

      const result = await geoService.processVfrXml(xmlContent, {
        targetCrs: 'EPSG:4326',
        computeAreas: true,
        deduplicateByProperty: 'uzemi_kod',
      });

      expect(result).toEqual(mockResponse);
      expect(mockNatsService.request).toHaveBeenCalledWith(
        'popula.geo.process_vfr',
        expect.objectContaining({
          xmlContent,
          options: {
            targetCrs: 'EPSG:4326',
            computeAreas: true,
            deduplicateByProperty: 'uzemi_kod',
          },
        }),
        30000 // 30 second timeout for large files
      );
    });

    it('should handle errors from worker', async () => {
      const xmlContent = 'invalid xml';
      const mockError = {
        error: 'XML parsing failed',
        details: 'Invalid XML structure',
      };

      vi.mocked(mockNatsService.request).mockRejectedValue(new Error('NATS timeout'));

      await expect(
        geoService.processVfrXml(xmlContent, {
          targetCrs: 'EPSG:4326',
        })
      ).rejects.toThrow('NATS timeout');
    });

    it('should use default options when not provided', async () => {
      const xmlContent = '<test>xml</test>';
      const mockResponse: GeoProcessResponse = {
        geojson: { type: 'FeatureCollection', features: [] },
        metadata: {
          featureCount: 0,
          bbox: [0, 0, 0, 0],
          processingTimeMs: 50,
          sourceCrs: 'EPSG:5514',
          targetCrs: 'EPSG:4326',
        },
      };

      vi.mocked(mockNatsService.request).mockResolvedValue({
        id: 'msg-1',
        timestamp: '2024-01-01T00:00:00Z',
        correlationId: 'corr-1',
        payload: mockResponse,
      });

      await geoService.processVfrXml(xmlContent);

      expect(mockNatsService.request).toHaveBeenCalledWith(
        'popula.geo.process_vfr',
        expect.objectContaining({
          options: {
            targetCrs: 'EPSG:4326',
          },
        }),
        30000
      );
    });

    it('should pass custom timeout to NATS request', async () => {
      const xmlContent = '<test>xml</test>';
      const mockResponse: GeoProcessResponse = {
        geojson: { type: 'FeatureCollection', features: [] },
        metadata: {
          featureCount: 0,
          bbox: [0, 0, 0, 0],
          processingTimeMs: 50,
          sourceCrs: 'EPSG:5514',
          targetCrs: 'EPSG:4326',
        },
      };

      vi.mocked(mockNatsService.request).mockResolvedValue({
        id: 'msg-1',
        timestamp: '2024-01-01T00:00:00Z',
        correlationId: 'corr-1',
        payload: mockResponse,
      });

      await geoService.processVfrXml(xmlContent, { targetCrs: 'EPSG:4326' }, 60000);

      expect(mockNatsService.request).toHaveBeenCalledWith(
        'popula.geo.process_vfr',
        expect.anything(),
        60000
      );
    });
  });
});
