import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { GeoJsonLayer } from '@deck.gl/layers';
import type { Feature, Geometry } from 'geojson';
import { createPopulationColorScale } from '../Map/populationData';
import { DENSITY_COLORS, REGION_FILL_COLOR, REGION_HOVER_COLOR, REGION_LINE_COLOR } from '../Map/constants';
import { reprojectFeatureCollection5514ToWgs84 } from './reprojectionCz';
import { parseCzPopulationCsvByYear, precomputeCzPopulationByYear, augmentCzFeatures } from './czPopulationData';
import { parseVfrGmlToGeoJSON } from './vfrToGeojson';
import { filterFeaturesByZoom } from './zoomFiltering';
import { filterFeaturesByViewport, type BBox } from './viewportFiltering';
import type { RegionProperties } from '../Map/types';
import { natsService } from '../../services/nats';
import { GeoService } from '../../services/geo';
import styles from '../Map/Map.module.css';

const CZ_GEOJSON_URL = '/sample-data/cz-zsj.geojson';
const CZ_POP_CSV_URL = '/sample-data/sldb2021_obyv_byt_zsj.csv';
const CZ_GML_FALLBACK = '/sample-data/20260107_ST_ZKSG.xml';

const isLikelyWgs84 = (coord: [number, number]) => Math.abs(coord[0]) <= 180 && Math.abs(coord[1]) <= 90;

export function CzMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const deckOverlay = useRef<MapboxOverlay | null>(null);

  const [lng, setLng] = useState(15.3);
  const [lat, setLat] = useState(49.8);
  const [zoom, setZoom] = useState(6);
  const [viewportBBox, setViewportBBox] = useState<BBox>({ west: 12, south: 48, east: 19, north: 51 });
  const [basemapVisible, setBasemapVisible] = useState(true);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ name: string; population: number | null; density: number | null; areaSqKm: number | null } | null>(null);

  const [regionsData, setRegionsData] = useState<Feature<Geometry, RegionProperties>[] | null>(null);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [regionsError, setRegionsError] = useState<string | null>(null);

  const [populationByYear, setPopulationByYear] = useState<Map<string, Map<string, number>> | null>(null);
  const [populationYears, setPopulationYears] = useState<string[]>([]);
  const [populationYear, setPopulationYear] = useState<string | null>(null);
  const [populationError, setPopulationError] = useState<string | null>(null);

  const [perYearFeatures, setPerYearFeatures] = useState<Map<string, Feature<Geometry, RegionProperties>[]>>(new globalThis.Map());
  const [layerFeatures, setLayerFeatures] = useState<Feature<Geometry, RegionProperties>[] | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(500);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [natsConnected, setNatsConnected] = useState(false);
  const [uploadProcessing, setUploadProcessing] = useState(false);
  const geoServiceRef = useRef<GeoService | null>(null);

  // Connect to NATS and initialize GeoService
  useEffect(() => {
    const connectNats = async () => {
      try {
        await natsService.connect();
        setNatsConnected(true);
        geoServiceRef.current = new GeoService(natsService);
        console.log('[CzMap] Connected to NATS, GeoService ready');
      } catch (err) {
        console.error('[CzMap] Failed to connect to NATS:', err);
        setNatsConnected(false);
      }
    };
    connectNats();
  }, []);

  // Load CZ GeoJSON (expect preconverted; otherwise show guidance)
  useEffect(() => {
    const loadGeo = async () => {
      try {
        const res = await fetch(CZ_GEOJSON_URL);
        if (!res.ok) {
          throw new Error(`GeoJSON not found (${res.status}). Please upload a VFR XML file using the "📂 Upload VFR (XML)" button below.`);
        }
        
        // Check content type before parsing
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Invalid response type. Please upload a VFR XML file using the "📂 Upload VFR (XML)" button below.');
        }
        
        const data = await res.json();
        const anyFeature = data.features?.[0];
        let converted = data;
        const firstCoord: [number, number] | undefined = anyFeature?.geometry?.coordinates?.[0]?.[0]?.[0];
        if (firstCoord && !isLikelyWgs84(firstCoord)) {
          converted = reprojectFeatureCollection5514ToWgs84(data);
        }
        setRegionsData(converted.features);
        setRegionsLoading(false);
      } catch (err: any) {
        setRegionsError(err.message || 'Failed to load CZ GeoJSON. Please upload a VFR XML file.');
        setRegionsLoading(false);
      }
    };
    loadGeo();
  }, []);

  // Load population CSV
  useEffect(() => {
    const loadPop = async () => {
      try {
        const res = await fetch(CZ_POP_CSV_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const parsed = parseCzPopulationCsvByYear(text);
        const preferredYear = parsed.years.find((y) => y === '2021') ?? parsed.years[parsed.years.length - 1] ?? null;
        setPopulationYears(parsed.years);
        setPopulationYear(preferredYear);
        setPopulationByYear(parsed.byYear);
      } catch (err: any) {
        setPopulationError(err.message || 'Failed to load population CSV');
      }
    };
    loadPop();
  }, []);

  // Combine regions + population
  useEffect(() => {
    if (!regionsData) return;
    if (!populationByYear) {
      setLayerFeatures(augmentCzFeatures(regionsData, new globalThis.Map()));
      return;
    }
    const precomputed = precomputeCzPopulationByYear(regionsData, populationByYear, DENSITY_COLORS);
    setPerYearFeatures(precomputed.perYearFeatures);
    if (populationYear) {
      const pre = precomputed.perYearFeatures.get(populationYear);
      if (pre) setLayerFeatures(pre);
    }
  }, [regionsData, populationByYear, populationYear]);

  // Animation
  useEffect(() => {
    if (!isPlaying || populationYears.length === 0 || !populationYear) return;
    const idx = populationYears.indexOf(populationYear);
    const nextIdx = (idx + 1) % populationYears.length;
    const handle = setTimeout(() => setPopulationYear(populationYears[nextIdx]), animationSpeed);
    return () => clearTimeout(handle);
  }, [isPlaying, populationYear, populationYears, animationSpeed]);

  // Year change -> swap features
  useEffect(() => {
    if (!populationYear) return;
    const pre = perYearFeatures.get(populationYear);
    if (pre) setLayerFeatures(pre);
  }, [populationYear, perYearFeatures]);

  const handleFileUpload = async (file: File) => {
    if (!geoServiceRef.current) {
      setRegionsError('Geo service not initialized. Please wait for NATS connection.');
      return;
    }

    const fileSizeMB = file.size / (1024 * 1024);
    console.log('[CzMap] File size:', fileSizeMB.toFixed(2), 'MB');

    setUploadProcessing(true);
    setRegionsError(null);

    try {
      console.log('[CzMap] Reading file...');
      const readStart = performance.now();
      const xmlContent = await file.text();
      const readTime = performance.now() - readStart;
      console.log('[CzMap] File read complete in', Math.round(readTime), 'ms');
      console.log('[CzMap] Sending to Rust worker via NATS (chunked encoding)...');
      
      const startTime = performance.now();
      const response = await geoServiceRef.current.processVfrXml(xmlContent, {
        targetCrs: 'EPSG:4326', // Client expects WGS84
        computeAreas: true,
        deduplicateByProperty: 'uzemi_kod',
      }, 180000); // 180s timeout for very large files
      const elapsed = performance.now() - startTime;
      
      console.log('[CzMap] Rust worker processed VFR XML:', {
        featureCount: response.metadata.featureCount,
        duplicatesRemoved: response.metadata.duplicatesRemoved ?? 0,
        processingTimeMs: response.metadata.processingTimeMs,
        totalTimeMs: Math.round(elapsed),
        bbox: response.metadata.bbox,
      });
      
      // The Rust worker returns GeoJSON in EPSG:5514 (S-JTSK/Krovak)
      // We need to reproject to WGS84 on the client side
      console.log('[CzMap] Reprojecting from S-JTSK to WGS84...');
      const reprojStartTime = performance.now();
      const converted = reprojectFeatureCollection5514ToWgs84(response.geojson);
      const reprojElapsed = performance.now() - reprojStartTime;
      console.log('[CzMap] Reprojection completed in', Math.round(reprojElapsed), 'ms');
      
      setRegionsData(converted.features);
      setRegionsError(null);
      setRegionsLoading(false);
    } catch (err: any) {
      console.error('[CzMap] VFR processing error:', err);
      setRegionsError(err.message || 'Failed to process VFR file via Rust worker');
    } finally {
      setUploadProcessing(false);
    }
  };

  const onUploadClick = () => fileInputRef.current?.click();

  const densityColorScale = useMemo(() => {
    if (!layerFeatures) return null;
    const densities = layerFeatures.map((f) => f.properties?.density ?? null);
    return createPopulationColorScale(densities, DENSITY_COLORS);
  }, [layerFeatures]);

  const summary = useMemo(() => {
    if (!layerFeatures) return null;
    const withData = layerFeatures.filter((f) => f.properties?.hasPopulationData);
    const withoutData = layerFeatures.length - withData.length;
    const densities = withData
      .map((f) => f.properties?.density)
      .filter((v): v is number => Number.isFinite(v as number))
      .sort((a, b) => a - b);
    if (!densities.length) return { withData: withData.length, withoutData, min: null, median: null, max: null };
    const min = densities[0];
    const max = densities[densities.length - 1];
    const mid = Math.floor(densities.length / 2);
    const median = densities.length % 2 === 0 ? (densities[mid - 1] + densities[mid]) / 2 : densities[mid];
    return { withData: withData.length, withoutData, min, median, max };
  }, [layerFeatures]);

  const minYear = useMemo(() => (populationYears.length ? Number(populationYears[0]) : null), [populationYears]);
  const maxYear = useMemo(() => (populationYears.length ? Number(populationYears[populationYears.length - 1]) : null), [populationYears]);

  // Apply zoom-based and viewport-based filtering to improve performance
  const filteredFeatures = useMemo(() => {
    const features = layerFeatures || regionsData;
    if (!features) return null;
    
    // Step 1: Filter by zoom level (by area)
    const zoomFiltered = filterFeaturesByZoom(features, zoom);
    
    // Step 2: Filter by viewport (only at zoom >= 9 to reduce CPU overhead)
    const viewportFiltered = filterFeaturesByViewport(zoomFiltered, viewportBBox, zoom);
    
    console.log(`[CzMap] Zoom ${zoom.toFixed(1)}: ${viewportFiltered.length}/${features.length} features (zoom: ${zoomFiltered.length}, viewport: ${viewportFiltered.length})`);
    return viewportFiltered;
  }, [layerFeatures, regionsData, zoom, viewportBBox]);

  const getLayers = useCallback(() => {
    if (!overlayVisible) return [];
    if (!filteredFeatures) return [];
    return [
      new GeoJsonLayer<RegionProperties>({
        id: 'cz-regions',
        data: filteredFeatures,
        pickable: true,
        stroked: true,
        filled: true,
        extruded: false,
        opacity: 0.85,
        lineWidthUnits: 'pixels',
        lineWidthMinPixels: 1.0,
        getFillColor: (d: Feature<Geometry, RegionProperties>) => {
          const name = (d.properties as any)?.uzemi_txt || '';
          const density = (d.properties as any)?.density ?? null;
          const hasData = (d.properties as any)?.hasPopulationData;
          const baseColor =
            densityColorScale && hasData !== undefined
              ? densityColorScale(density)
              : hasData
              ? REGION_FILL_COLOR
              : [180, 180, 180, 120];
          return name === hoveredRegion ? REGION_HOVER_COLOR : (baseColor as [number, number, number, number]);
        },
        getLineColor: REGION_LINE_COLOR,
        getLineWidth: 1.0,
        onHover: (info) => {
          if (info.object) {
            const props = (info.object as Feature<Geometry, RegionProperties>).properties;
            setHoveredRegion((props as any)?.uzemi_txt || null);
            setHoverInfo({
              name: (props as any)?.uzemi_txt || '',
              population: (props as any)?.population ?? null,
              density: (props as any)?.density ?? null,
              areaSqKm: (props as any)?.areaSqKm ?? null
            });
          } else {
            setHoveredRegion(null);
            setHoverInfo(null);
          }
        },
        updateTriggers: { getFillColor: [hoveredRegion, densityColorScale, layerFeatures] }
      })
    ];
  }, [overlayVisible, filteredFeatures, densityColorScale, hoveredRegion]);

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }
        },
        layers: [
          {
            id: 'osm-tiles-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: [lng, lat],
      zoom
    });

    map.current.on('load', () => setMapReady(true));

    deckOverlay.current = new MapboxOverlay({ layers: [] });
    map.current.addControl(deckOverlay.current as unknown as maplibregl.IControl);
    map.current.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), 'top-right');
    map.current.addControl(new maplibregl.ScaleControl({ maxWidth: 200, unit: 'metric' }), 'bottom-left');

    map.current.on('move', () => {
      if (!map.current) return;
      const center = map.current.getCenter();
      const bounds = map.current.getBounds();
      setLng(parseFloat(center.lng.toFixed(4)));
      setLat(parseFloat(center.lat.toFixed(4)));
      setZoom(parseFloat(map.current.getZoom().toFixed(2)));
      setViewportBBox({
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth()
      });
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update deck layers
  useEffect(() => {
    if (deckOverlay.current) {
      deckOverlay.current.setProps({ layers: getLayers() });
    }
  }, [getLayers]);

  // Basemap visibility
  useEffect(() => {
    if (!map.current) return;
    const applyVisibility = () => {
      try {
        map.current?.setLayoutProperty('osm-tiles-layer', 'visibility', basemapVisible ? 'visible' : 'none');
      } catch (err) {
        if (map.current) {
          map.current.once('load', () => map.current?.setLayoutProperty('osm-tiles-layer', 'visibility', basemapVisible ? 'visible' : 'none'));
        }
      }
    };
    if (mapReady && map.current.isStyleLoaded()) {
      applyVisibility();
    } else if (map.current) {
      map.current.once('load', applyVisibility);
    }
  }, [basemapVisible, mapReady]);

  return (
    <div className={styles.mapPage}>
      <div className={styles.header}>
        <h1>🗺️ Czech Microregions (ZSJ)</h1>
        <p>Census 2021 population by základní sídelní jednotka</p>
      </div>

      <div className={styles.infoBar}>
        <span className={styles.coord}>
          <strong>Longitude:</strong> {lng}°
        </span>
        <span className={styles.coord}>
          <strong>Latitude:</strong> {lat}°
        </span>
        <span className={styles.coord}>
          <strong>Zoom:</strong> {zoom}
        </span>
        {regionsLoading && <span className={styles.coord}><strong>Regions:</strong> Loading...</span>}
        {regionsError && (
          <span className={styles.coordError}>
            <strong>Error:</strong> {regionsError}
          </span>
        )}
        {regionsData && (
          <span className={styles.coord}>
            <strong>Regions:</strong> {filteredFeatures?.length ?? 0} / {regionsData.length} (zoom filtered)
          </span>
        )}
        {populationYear && (
          <span className={styles.coord}>
            <strong>Population year:</strong> {populationYear}
          </span>
        )}
        {populationError && (
          <span className={styles.coordError}>
            <strong>Error:</strong> {populationError}
          </span>
        )}
      </div>

      {populationYears.length > 0 && populationYear && (
        <div className={styles.yearSliderContainer}>
          <div className={styles.yearSliderHeader}>
            <div className={styles.yearSliderLabel}>
              Year <strong>{populationYear}</strong>
            </div>
            <div className={styles.yearSliderPop}>Population density choropleth</div>
          </div>
          <div className={styles.yearSliderRow}>
            <button
              className={styles.playButton}
              onClick={() => setIsPlaying((p) => !p)}
              aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
            >
              {isPlaying ? '❚❚' : '►'}
            </button>
            <span className={styles.yearSliderMin}>{minYear ?? ''}</span>
            <input
              type="range"
              min={minYear ?? 0}
              max={maxYear ?? 0}
              step={1}
              value={Number(populationYear)}
              onChange={(e) => setPopulationYear(String(e.target.value))}
              className={styles.yearSlider}
            />
            <span className={styles.yearSliderMax}>{maxYear ?? ''}</span>
            <div className={styles.speedControl}>
              <span className={styles.speedLabel}>Speed:</span>
              <input
                type="range"
                min={50}
                max={1000}
                step={50}
                value={1050 - animationSpeed}
                onChange={(e) => setAnimationSpeed(1050 - parseInt(e.target.value))}
                className={styles.speedSlider}
                title={`${animationSpeed}ms per year`}
              />
            </div>
          </div>
        </div>
      )}

      <div className={styles.infoBar} style={{ marginTop: 'var(--space-2)' }}>
        <label className={styles.coord}>
          <input type="checkbox" checked={basemapVisible} onChange={(e) => setBasemapVisible(e.target.checked)} />
          <span><strong>Basemap</strong> (OSM tiles)</span>
        </label>
        <label className={styles.coord}>
          <input type="checkbox" checked={overlayVisible} onChange={(e) => setOverlayVisible(e.target.checked)} />
          <span><strong>ZSJ overlay</strong> (deck.gl)</span>
        </label>
        <button 
          className={styles.playButton} 
          onClick={onUploadClick} 
          style={{ width: 'auto', padding: '0 12px' }}
          disabled={uploadProcessing || !natsConnected}
          title={!natsConnected ? 'Waiting for NATS connection...' : uploadProcessing ? 'Processing...' : 'Upload VFR XML file'}
        >
          {uploadProcessing ? '⏳ Processing...' : !natsConnected ? '🔌 Connecting...' : '📂 Upload VFR (XML)'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xml,.gml"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
        />
      </div>

      {hoverInfo && (
        <div className={styles.tooltip}>
          <strong>📍 {hoverInfo.name}</strong>
          <div>{hoverInfo.population !== null ? <>Population: {Math.round(hoverInfo.population).toLocaleString()}</> : <>Population: No data</>}</div>
          <div>
            {hoverInfo.density !== null && hoverInfo.areaSqKm ? (
              <>Density: {Math.round(hoverInfo.density).toLocaleString()} / km²</>
            ) : (
              <>Density: No data</>
            )}
          </div>
          {hoverInfo.areaSqKm ? <div>Area: {hoverInfo.areaSqKm.toFixed(2)} km²</div> : <div>Area: n/a</div>}
        </div>
      )}

      <div className={styles.mapWrapper}>
        <div ref={mapContainer} className={styles.mapContainer} />
      </div>

      {summary && (
        <div className={styles.summary}>
          <h3>Summary</h3>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <div className={styles.summaryLabel}>Regions with data</div>
              <div className={styles.summaryValue}>{summary.withData}</div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryLabel}>Regions without data</div>
              <div className={styles.summaryValue}>{summary.withoutData}</div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryLabel}>Min density</div>
              <div className={styles.summaryValue}>{summary.min !== null ? `${Math.round(summary.min).toLocaleString()} / km²` : 'n/a'}</div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryLabel}>Median density</div>
              <div className={styles.summaryValue}>{summary.median !== null ? `${Math.round(summary.median).toLocaleString()} / km²` : 'n/a'}</div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryLabel}>Max density</div>
              <div className={styles.summaryValue}>{summary.max !== null ? `${Math.round(summary.max).toLocaleString()} / km²` : 'n/a'}</div>
            </div>
            {populationYear && (
              <div className={styles.summaryItem}>
                <div className={styles.summaryLabel}>Year</div>
                <div className={styles.summaryValue}>{populationYear}</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={styles.instructions}>
        <h3>Legend</h3>
        <div className={styles.legend}>
          <div className={styles.legendRow}>
            {DENSITY_COLORS.map((c, idx) => (
              <span
                key={`legend-${idx}`}
                className={styles.legendSwatch}
                style={{ background: `rgba(${c[0]},${c[1]},${c[2]},${c[3] / 255})` }}
              />
            ))}
            <span className={styles.legendLabel}>Higher population density →</span>
          </div>
          <div className={styles.legendRow}>
            <span className={styles.legendSwatch} style={{ background: 'rgba(180,180,180,0.5)' }} />
            <span className={styles.legendLabel}>No data</span>
          </div>
        </div>
      </div>

      <div className={styles.instructions}>
        <h3>Navigation</h3>
        <ul>
          <li><strong>Pan:</strong> Click and drag</li>
          <li><strong>Zoom:</strong> Scroll wheel or use +/- buttons</li>
          <li><strong>Rotate:</strong> Right-click and drag, or hold Ctrl + drag</li>
          <li><strong>Reset North:</strong> Click the compass</li>
          <li><strong>Hover:</strong> Mouse over regions to see names</li>
        </ul>
      </div>
    </div>
  );
}
