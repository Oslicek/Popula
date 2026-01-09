/**
 * Geo Processing Service
 * 
 * Handles communication with the Rust worker for geographical data processing
 * (VFR XML parsing, coordinate reprojection, area calculation, etc.)
 */

import type { NatsService } from './nats';
import type { GeoProcessRequest, GeoProcessResponse, GeoProcessOptions } from '@popula/shared-types';
import { SUBJECTS } from '@popula/shared-types';

export class GeoService {
  constructor(private natsService: NatsService) {}

  /**
   * Process VFR XML file via Rust worker
   * 
   * @param xmlContent Raw VFR XML content
   * @param options Processing options
   * @param timeoutMs Request timeout (default: 30s for large files)
   * @returns Processed GeoJSON with metadata
   */
  async processVfrXml(
    xmlContent: string,
    options: Partial<GeoProcessOptions> = {},
    timeoutMs: number = 30000
  ): Promise<GeoProcessResponse> {
    const request: GeoProcessRequest = {
      xmlContent,
      options: {
        targetCrs: options.targetCrs ?? 'EPSG:4326',
        simplify: options.simplify,
        simplificationTolerance: options.simplificationTolerance,
        computeAreas: options.computeAreas,
        deduplicateByProperty: options.deduplicateByProperty,
      },
    };

    try {
      const response = await this.natsService.request<GeoProcessRequest, GeoProcessResponse>(
        SUBJECTS.GEO_PROCESS_VFR,
        request,
        timeoutMs
      );

      return response.payload;
    } catch (error) {
      console.error('[GeoService] VFR processing failed:', error);
      throw error;
    }
  }
}
