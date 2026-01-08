import { describe, it, expect } from 'vitest';
import { parseVfrGmlToGeoJSON } from './vfrToGeojson';

const sampleXml = `
<?xml version="1.0" encoding="UTF-8"?>
<vf:VymennyFormat xmlns:gml="http://www.opengis.net/gml/3.2" xmlns:vf="urn:cz:isvs:ruian:schemas:VymennyFormatTypy:v1" xmlns:obi="urn:cz:isvs:ruian:schemas:ObecIntTypy:v1">
  <vf:Data>
    <vf:Obce>
      <obi:Obec gml:id="OB.1001">
        <obi:Kod>1001</obi:Kod>
        <obi:Nazev>Test Obec</obi:Nazev>
        <obi:Geometrie>
          <obi:GeneralizovaneHranice3>
            <gml:MultiSurface gml:id="GOB.1001.3" srsName="urn:ogc:def:crs:EPSG::5514" srsDimension="2">
              <gml:surfaceMember>
                <gml:Polygon gml:id="GOB.1001.3.1">
                  <gml:exterior>
                    <gml:LinearRing>
                      <gml:posList>0 0 10 0 10 10 0 10 0 0</gml:posList>
                    </gml:LinearRing>
                  </gml:exterior>
                </gml:Polygon>
              </gml:surfaceMember>
            </gml:MultiSurface>
          </obi:GeneralizovaneHranice3>
        </obi:Geometrie>
      </obi:Obec>
    </vf:Obce>
  </vf:Data>
</vf:VymennyFormat>
`;

describe('parseVfrGmlToGeoJSON', () => {
  it('converts VFR GML MultiSurface to GeoJSON with properties', () => {
    const fc = parseVfrGmlToGeoJSON(sampleXml);
    expect(fc.features).toHaveLength(1);
    const f = fc.features[0];
    expect(f.properties?.uzemi_kod).toBe('1001');
    expect(f.properties?.uzemi_txt).toBe('Test Obec');
    expect(f.geometry?.type).toBe('Polygon');
    const coords = (f.geometry as any).coordinates[0] as [number, number][];
    expect(coords[0]).toEqual([0, 0]);
    expect(coords[2]).toEqual([10, 10]);
  });
});
