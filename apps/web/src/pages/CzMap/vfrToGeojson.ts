import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { DOMParser as XmldomParser } from '@xmldom/xmldom';
import type { RegionProperties } from '../Map/types';

type ParsedProps = {
  uzemi_kod?: string;
  uzemi_txt?: string;
};

const textContentOfFirst = (root: Element, predicate: (el: Element) => boolean): string | null => {
  const stack: Element[] = [root];
  while (stack.length) {
    const el = stack.pop()!;
    if (predicate(el)) {
      return el.textContent?.trim() || null;
    }
    const children = Array.from(el.childNodes).filter((n) => n.nodeType === 1) as Element[];
    for (const c of children) stack.push(c);
  }
  return null;
};

const parsePosList = (posListText: string): [number, number][][] => {
  const nums = posListText
    .trim()
    .split(/\s+/)
    .map(Number)
    .filter((v) => Number.isFinite(v));
  const coords: [number, number][] = [];
  for (let i = 0; i < nums.length; i += 2) {
    coords.push([nums[i], nums[i + 1]]);
  }
  return coords.length ? [[...coords]] : [];
};

const extractProperties = (element: Element): ParsedProps => {
  // Walk ancestors to find code/name tags (e.g., *:Kod, *:Nazev)
  let current: Element | null = element;
  for (let depth = 0; depth < 5 && current; depth++) {
    const code = textContentOfFirst(current, (el) => /Kod$/i.test(el.tagName));
    const name = textContentOfFirst(current, (el) => /Nazev$/i.test(el.tagName));
    if (code || name) {
      return { uzemi_kod: code || undefined, uzemi_txt: name || undefined };
    }
    const parent = current.parentNode;
    current = parent && parent.nodeType === 1 ? (parent as Element) : null;
  }
  return {};
};

/**
 * Minimal VFR/GML → GeoJSON converter for polygons/multisurfaces.
 * Assumptions:
 * - Geometries are in gml:MultiSurface → surfaceMember → Polygon → exterior → LinearRing → posList
 * - Coordinates are projected (e.g., EPSG:5514). Reprojection is handled separately.
 */
export function parseVfrGmlToGeoJSON(xmlText: string): FeatureCollection<Geometry, RegionProperties> {
  const DomImpl: typeof DOMParser =
    typeof DOMParser !== 'undefined' ? DOMParser : (XmldomParser as unknown as typeof DOMParser);
  const parser = new DomImpl();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const multiSurfaces = Array.from(doc.getElementsByTagNameNS('*', 'MultiSurface'));

  const features: Feature<Geometry, RegionProperties>[] = [];

  for (const ms of multiSurfaces) {
    const polygons: [number, number][][][] = [];
    const surfaceMembers = Array.from(ms.getElementsByTagNameNS('*', 'surfaceMember'));
    for (const sm of surfaceMembers) {
      const polygon = sm.getElementsByTagNameNS('*', 'Polygon')[0];
      if (!polygon) continue;
      const exterior = polygon.getElementsByTagNameNS('*', 'exterior')[0];
      if (!exterior) continue;
      const ring = exterior.getElementsByTagNameNS('*', 'LinearRing')[0];
      if (!ring) continue;
      const posList = ring.getElementsByTagNameNS('*', 'posList')[0];
      if (!posList || !posList.textContent) continue;
      const coords = parsePosList(posList.textContent);
      if (coords.length) {
        polygons.push(coords);
      }
    }

    if (!polygons.length) continue;

    const props = extractProperties(ms);
    const id =
      ms.getAttribute('gml:id') ||
      ms.getAttribute('id') ||
      surfaceMembers[0]?.getElementsByTagNameNS('*', 'Polygon')[0]?.getAttribute('gml:id') ||
      undefined;

    features.push({
      type: 'Feature',
      properties: { ...props, id },
      geometry: polygons.length === 1 ? { type: 'Polygon', coordinates: polygons[0] } : { type: 'MultiPolygon', coordinates: polygons }
    });
  }

  return { type: 'FeatureCollection', features };
}
