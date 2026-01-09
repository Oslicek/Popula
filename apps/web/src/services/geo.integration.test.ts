/**
 * Integration test for Geo Processing Service
 * 
 * Requires NATS server and Rust worker to be running:
 * 1. Start NATS: `docker run -d -p 4222:4222 -p 8080:8080 nats:latest -js --ws_port 8080`
 * 2. Start worker: `cd worker && cargo run`
 * 3. Run test: `pnpm test geo.integration.test.ts`
 * 
 * Note: This test is skipped by default. Set INTEGRATION_TEST=true to run.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NatsService } from './nats';
import { GeoService } from './geo';

const SKIP_INTEGRATION = !process.env.INTEGRATION_TEST;

describe.skipIf(SKIP_INTEGRATION)('GeoService Integration', () => {
  let natsService: NatsService;
  let geoService: GeoService;

  beforeAll(async () => {
    natsService = new NatsService();
    await natsService.connect('ws://localhost:8080');
    geoService = new GeoService(natsService);
  }, 10000); // 10s timeout for connection

  afterAll(async () => {
    await natsService.disconnect();
  });

  it('should process a simple VFR XML polygon', async () => {
    const simpleVfr = `<?xml version="1.0" encoding="UTF-8"?>
<vf:VymennyFormat xmlns:vf="urn:cz:isvs:ruian:schemas:VymennyFormatTypy:v1"
                  xmlns:gml="http://www.opengis.net/gml/3.2"
                  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <vf:Data>
    <vf:Zsj gml:id="ZSJ.1">
      <vf:Geometrie>
        <gml:MultiSurface srsName="urn:ogc:def:crs:EPSG::5514" srsDimension="2">
          <gml:surfaceMember>
            <gml:Polygon>
              <gml:exterior>
                <gml:LinearRing>
                  <gml:posList>-744896.97 -1042363.56 -744890.40 -1042366.96 -744887.78 -1042365.89 -744896.97 -1042363.56</gml:posList>
                </gml:LinearRing>
              </gml:exterior>
            </gml:Polygon>
          </gml:surfaceMember>
        </gml:MultiSurface>
      </vf:Geometrie>
      <vf:Kod>123456</vf:Kod>
      <vf:Nazev>Test ZSJ</vf:Nazev>
    </vf:Zsj>
  </vf:Data>
</vf:VymennyFormat>`;

    const result = await geoService.processVfrXml(simpleVfr, {
      targetCrs: 'EPSG:4326',
      computeAreas: true,
    });

    expect(result.geojson.type).toBe('FeatureCollection');
    expect(result.geojson.features).toHaveLength(1);
    expect(result.geojson.features[0].properties?.uzemi_kod).toBe('123456');
    expect(result.geojson.features[0].properties?.nazev).toBe('Test ZSJ');
    expect(result.geojson.features[0].properties?.area_sq_m).toBeGreaterThan(0);
    
    expect(result.metadata.featureCount).toBe(1);
    expect(result.metadata.sourceCrs).toBe('EPSG:5514');
    expect(result.metadata.targetCrs).toBe('EPSG:4326');
    expect(result.metadata.processingTimeMs).toBeGreaterThan(0);
    expect(result.metadata.bbox).toHaveLength(4);

    console.log('✅ Rust worker processed VFR in', result.metadata.processingTimeMs, 'ms');
  }, 30000); // 30s timeout for processing

  it('should deduplicate features by uzemi_kod', async () => {
    const vfrWithDuplicates = `<?xml version="1.0" encoding="UTF-8"?>
<vf:VymennyFormat xmlns:vf="urn:cz:isvs:ruian:schemas:VymennyFormatTypy:v1"
                  xmlns:gml="http://www.opengis.net/gml/3.2">
  <vf:Data>
    <vf:Zsj gml:id="ZSJ.1">
      <vf:Geometrie>
        <gml:MultiSurface srsName="urn:ogc:def:crs:EPSG::5514">
          <gml:surfaceMember>
            <gml:Polygon>
              <gml:exterior>
                <gml:LinearRing>
                  <gml:posList>-744896.97 -1042363.56 -744890.40 -1042366.96 -744887.78 -1042365.89 -744896.97 -1042363.56</gml:posList>
                </gml:LinearRing>
              </gml:exterior>
            </gml:Polygon>
          </gml:surfaceMember>
        </gml:MultiSurface>
      </vf:Geometrie>
      <vf:Kod>123456</vf:Kod>
      <vf:Nazev>Duplicate 1</vf:Nazev>
    </vf:Zsj>
    <vf:Zsj gml:id="ZSJ.2">
      <vf:Geometrie>
        <gml:MultiSurface srsName="urn:ogc:def:crs:EPSG::5514">
          <gml:surfaceMember>
            <gml:Polygon>
              <gml:exterior>
                <gml:LinearRing>
                  <gml:posList>-744896.97 -1042363.56 -744890.40 -1042366.96 -744887.78 -1042365.89 -744896.97 -1042363.56</gml:posList>
                </gml:LinearRing>
              </gml:exterior>
            </gml:Polygon>
          </gml:surfaceMember>
        </gml:MultiSurface>
      </vf:Geometrie>
      <vf:Kod>123456</vf:Kod>
      <vf:Nazev>Duplicate 2</vf:Nazev>
    </vf:Zsj>
    <vf:Zsj gml:id="ZSJ.3">
      <vf:Geometrie>
        <gml:MultiSurface srsName="urn:ogc:def:crs:EPSG::5514">
          <gml:surfaceMember>
            <gml:Polygon>
              <gml:exterior>
                <gml:LinearRing>
                  <gml:posList>-744896.97 -1042363.56 -744890.40 -1042366.96 -744887.78 -1042365.89 -744896.97 -1042363.56</gml:posList>
                </gml:LinearRing>
              </gml:exterior>
            </gml:Polygon>
          </gml:surfaceMember>
        </gml:MultiSurface>
      </vf:Geometrie>
      <vf:Kod>789012</vf:Kod>
      <vf:Nazev>Unique Feature</vf:Nazev>
    </vf:Zsj>
  </vf:Data>
</vf:VymennyFormat>`;

    const result = await geoService.processVfrXml(vfrWithDuplicates, {
      targetCrs: 'EPSG:4326',
      deduplicateByProperty: 'uzemi_kod',
    });

    expect(result.geojson.features).toHaveLength(2);
    expect(result.metadata.featureCount).toBe(2);
    expect(result.metadata.duplicatesRemoved).toBe(1);

    const codes = result.geojson.features.map(f => f.properties?.uzemi_kod);
    expect(codes).toContain('123456');
    expect(codes).toContain('789012');

    console.log('✅ Deduplication removed', result.metadata.duplicatesRemoved, 'duplicates');
  }, 30000);

  it('should handle large VFR files efficiently', async () => {
    // Generate a larger test file with 100 features
    const features = Array.from({ length: 100 }, (_, i) => `
      <vf:Zsj gml:id="ZSJ.${i}">
        <vf:Geometrie>
          <gml:MultiSurface srsName="urn:ogc:def:crs:EPSG::5514">
            <gml:surfaceMember>
              <gml:Polygon>
                <gml:exterior>
                  <gml:LinearRing>
                    <gml:posList>-744896.97 -1042363.56 -744890.40 -1042366.96 -744887.78 -1042365.89 -744896.97 -1042363.56</gml:posList>
                  </gml:LinearRing>
                </gml:exterior>
              </gml:Polygon>
            </gml:surfaceMember>
          </gml:MultiSurface>
        </vf:Geometrie>
        <vf:Kod>${100000 + i}</vf:Kod>
        <vf:Nazev>Feature ${i}</vf:Nazev>
      </vf:Zsj>
    `).join('\n');

    const largeVfr = `<?xml version="1.0" encoding="UTF-8"?>
<vf:VymennyFormat xmlns:vf="urn:cz:isvs:ruian:schemas:VymennyFormatTypy:v1"
                  xmlns:gml="http://www.opengis.net/gml/3.2">
  <vf:Data>
    ${features}
  </vf:Data>
</vf:VymennyFormat>`;

    const result = await geoService.processVfrXml(largeVfr, {
      targetCrs: 'EPSG:4326',
      computeAreas: true,
    });

    expect(result.geojson.features).toHaveLength(100);
    expect(result.metadata.processingTimeMs).toBeLessThan(5000); // Should process in under 5s

    console.log('✅ Processed 100 features in', result.metadata.processingTimeMs, 'ms');
    console.log('   Average:', (result.metadata.processingTimeMs / 100).toFixed(2), 'ms per feature');
  }, 30000);
});

describe('GeoService Integration - Error Cases', () => {
  it('should provide helpful error when NATS is not available', async () => {
    const natsService = new NatsService();
    const geoService = new GeoService(natsService);

    await expect(
      geoService.processVfrXml('<invalid>xml</invalid>')
    ).rejects.toThrow('Not connected to NATS');
  });
});
