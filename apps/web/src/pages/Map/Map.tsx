import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { GeoJsonLayer } from '@deck.gl/layers';
import type { Feature, Geometry } from 'geojson';
import { reprojectFeatureCollection27700ToWgs84 } from './reprojection';
import {
  augmentFeaturesWithPopulation,
  createPopulationColorScale,
  getLastYearFromCsv,
  parsePopulationCsvByYear
} from './populationData';
import type { RegionProperties } from './types';
import styles from './Map.module.css';

// UK Local Authority GeoJSON path
const UK_REGIONS_URL = '/sample-data/uk-local-authorities.geojson';
const UK_POPULATION_CSV_URL = '/sample-data/2022 SNPP Population persons.csv';

// Color scale for regions (pronounced)
const REGION_FILL_COLOR: [number, number, number, number] = [255, 64, 128, 160]; // bright magenta, semi-opaque
const REGION_LINE_COLOR: [number, number, number, number] = [255, 255, 255, 255]; // white outline
const REGION_HOVER_COLOR: [number, number, number, number] = [255, 214, 64, 220]; // gold on hover

export function Map() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const deckOverlay = useRef<MapboxOverlay | null>(null);
  const [lng, setLng] = useState(-2.5); // UK center longitude
  const [lat, setLat] = useState(54.5); // UK center latitude
  const [zoom, setZoom] = useState(5.5);
  const [basemapVisible, setBasemapVisible] = useState(true);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [regionsData, setRegionsData] = useState<Feature<Geometry, RegionProperties>[] | null>(null);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [regionsError, setRegionsError] = useState<string | null>(null);
  const [populationByCode, setPopulationByCode] = useState<Map<string, number> | null>(null);
  const [populationByYear, setPopulationByYear] = useState<Map<string, Map<string, number>> | null>(null);
  const [populationLoading, setPopulationLoading] = useState(true);
  const [populationError, setPopulationError] = useState<string | null>(null);
  const [populationYear, setPopulationYear] = useState<string | null>(null);
  const [populationYears, setPopulationYears] = useState<string[]>([]);
  const [layerFeatures, setLayerFeatures] = useState<Feature<Geometry, RegionProperties>[] | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ name: string; population: number | null; density: number | null; areaSqKm: number | null } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(500);

  // Load GeoJSON data
  useEffect(() => {
    fetch(UK_REGIONS_URL)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(data => {
        const converted = reprojectFeatureCollection27700ToWgs84(data);
        setRegionsData(converted.features);
        setRegionsLoading(false);
        console.log(`[Map] Loaded ${data.features.length} regions (reprojected to WGS84)`);
      })
      .catch(error => {
        console.error('[Map] Failed to load regions:', error);
        setRegionsError(error.message);
        setRegionsLoading(false);
      });
  }, []);

  // Load population CSV and build lookup
  useEffect(() => {
    setPopulationLoading(true);
    fetch(UK_POPULATION_CSV_URL)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then(text => {
        const latestYear = getLastYearFromCsv(text) ?? '2047';
        const parsed = parsePopulationCsvByYear(text);
        setPopulationYears(parsed.years);
        setPopulationYear(latestYear);
        setPopulationByYear(parsed.byYear);
        const map = parsed.byYear.get(latestYear) ?? new Map();
        setPopulationByCode(map);
        setPopulationLoading(false);
        console.log(`[Map] Loaded population CSV, latest year ${latestYear}, areas ${map.size}`);
      })
      .catch(error => {
        console.error('[Map] Failed to load population CSV:', error);
        setPopulationError(error.message);
        setPopulationLoading(false);
      });
  }, []);

  // Combine regions with population lookup
  useEffect(() => {
    if (!regionsData) return;
    if (populationByCode) {
      setLayerFeatures(augmentFeaturesWithPopulation(regionsData, populationByCode));
    } else {
      setLayerFeatures(augmentFeaturesWithPopulation(regionsData, new Map()));
    }
  }, [regionsData, populationByCode]);

  const densityColorScale = useMemo(() => {
    if (!layerFeatures) return null;
    const densities = layerFeatures.map((f) => f.properties?.density ?? null);
    return createPopulationColorScale(densities);
  }, [layerFeatures]);

  // Animation effect for year slider
  useEffect(() => {
    if (!isPlaying || populationYears.length === 0 || !populationYear) return;
    const idx = populationYears.indexOf(populationYear);
    const nextIdx = (idx + 1) % populationYears.length;
    const handle = setTimeout(() => {
      const nextYear = populationYears[nextIdx];
      setPopulationYear(nextYear);
    }, animationSpeed);
    return () => clearTimeout(handle);
  }, [isPlaying, populationYear, populationYears, animationSpeed]);

  // Update population map when year changes
  useEffect(() => {
    if (!populationYear || !populationByYear) return;
    const map = populationByYear.get(populationYear) ?? new Map();
    setPopulationByCode(map);
  }, [populationYear, populationByYear]);

  const summary = useMemo(() => {
    if (!layerFeatures) return null;
    const withData = layerFeatures.filter((f) => f.properties?.hasPopulationData);
    const withoutData = layerFeatures.length - withData.length;
    const densities = withData
      .map((f) => f.properties?.density)
      .filter((v): v is number => Number.isFinite(v as number))
      .sort((a, b) => a - b);
    if (densities.length === 0) {
      return { withData: withData.length, withoutData, min: null, median: null, max: null };
    }
    const min = densities[0];
    const max = densities[densities.length - 1];
    const mid = Math.floor(densities.length / 2);
    const median = densities.length % 2 === 0 ? (densities[mid - 1] + densities[mid]) / 2 : densities[mid];
    return { withData: withData.length, withoutData, min, median, max };
  }, [layerFeatures]);

  const minYear = useMemo(() => (populationYears.length ? Number(populationYears[0]) : null), [populationYears]);
  const maxYear = useMemo(() => (populationYears.length ? Number(populationYears[populationYears.length - 1]) : null), [populationYears]);

  // Create deck.gl layers
  const getLayers = useCallback(() => {
    if (!overlayVisible) return [];
    const data = layerFeatures || regionsData;
    if (!data) return [];

    return [
      new GeoJsonLayer<RegionProperties>({
        id: 'uk-regions',
        data,
        pickable: true,
        stroked: true,
        filled: true,
        extruded: false,
        opacity: 0.85,
        lineWidthUnits: 'pixels',
        lineWidthMinPixels: 1.2,
        getFillColor: (d: Feature<Geometry, RegionProperties>) => {
            const name = d.properties?.LAD23NM || '';
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
        getLineWidth: 1.2,
        onHover: (info) => {
          if (info.object) {
            const props = (info.object as Feature<Geometry, RegionProperties>).properties;
            setHoveredRegion(props?.LAD23NM || null);
            setHoverInfo({
              name: props?.LAD23NM || '',
              population: (props as any)?.population ?? null,
              density: (props as any)?.density ?? null,
              areaSqKm: (props as any)?.areaSqKm ?? null
            });
          } else {
            setHoveredRegion(null);
            setHoverInfo(null);
          }
        },
        updateTriggers: {
          getFillColor: [hoveredRegion, densityColorScale, layerFeatures]
        }
      })
    ];
  }, [overlayVisible, layerFeatures, hoveredRegion, densityColorScale, regionsData]);

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
            tiles: [
              'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
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
      zoom: zoom
    });

    map.current.on('load', () => {
      setMapReady(true);
    });

    // Initialize deck.gl overlay
    deckOverlay.current = new MapboxOverlay({
      layers: []
    });
    map.current.addControl(deckOverlay.current as unknown as maplibregl.IControl);

    // Add navigation controls (zoom + rotation)
    map.current.addControl(
      new maplibregl.NavigationControl({
        visualizePitch: true,
        showCompass: true,
        showZoom: true
      }),
      'top-right'
    );

    // Add scale control
    map.current.addControl(
      new maplibregl.ScaleControl({
        maxWidth: 200,
        unit: 'metric'
      }),
      'bottom-left'
    );

    // Add fullscreen control
    map.current.addControl(
      new maplibregl.FullscreenControl(),
      'top-right'
    );

    // Add geolocate control
    map.current.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      }),
      'top-right'
    );

    // Update state when map moves
    map.current.on('move', () => {
      if (!map.current) return;
      const center = map.current.getCenter();
      setLng(parseFloat(center.lng.toFixed(4)));
      setLat(parseFloat(center.lat.toFixed(4)));
      setZoom(parseFloat(map.current.getZoom().toFixed(2)));
    });

    // Cleanup on unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update deck.gl layers when data or hover state changes
  useEffect(() => {
    if (deckOverlay.current) {
      deckOverlay.current.setProps({ layers: getLayers() });
    }
  }, [getLayers]);

  // Toggle basemap visibility
  useEffect(() => {
    if (!map.current) return;
    const applyVisibility = () => {
      try {
        map.current?.setLayoutProperty('osm-tiles-layer', 'visibility', basemapVisible ? 'visible' : 'none');
      } catch (err) {
        // If style isn't ready yet, wait for load
        if (map.current) {
          map.current.once('load', () => {
            map.current?.setLayoutProperty('osm-tiles-layer', 'visibility', basemapVisible ? 'visible' : 'none');
          });
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
        <h1>🗺️ Geographic Data</h1>
        <p>Explore demographic data on the map</p>
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
        {regionsLoading && (
          <span className={styles.coord}>
            <strong>Regions:</strong> Loading...
          </span>
        )}
        {regionsError && (
          <span className={styles.coordError}>
            <strong>Error:</strong> {regionsError}
          </span>
        )}
        {regionsData && (
          <span className={styles.coord}>
            <strong>Regions:</strong> {regionsData.length}
          </span>
        )}
        {populationYear && (
          <span className={styles.coord}>
            <strong>Population year:</strong> {populationYear}
          </span>
        )}
        {populationLoading && (
          <span className={styles.coord}>
            <strong>Population:</strong> Loading...
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
          <input
            type="checkbox"
            checked={basemapVisible}
            onChange={(e) => setBasemapVisible(e.target.checked)}
          />
          <span><strong>Basemap</strong> (OSM tiles)</span>
        </label>
        <label className={styles.coord}>
          <input
            type="checkbox"
            checked={overlayVisible}
            onChange={(e) => setOverlayVisible(e.target.checked)}
          />
          <span><strong>Regions overlay</strong> (deck.gl)</span>
        </label>
      </div>
      
      {hoverInfo && (
        <div className={styles.tooltip}>
          <strong>📍 {hoverInfo.name}</strong>
          <div>
            {hoverInfo.population !== null ? (
              <>Population: {Math.round(hoverInfo.population).toLocaleString()}</>
            ) : (
              <>Population: No data</>
            )}
          </div>
          <div>
            {hoverInfo.density !== null && hoverInfo.areaSqKm ? (
              <>Density: {Math.round(hoverInfo.density).toLocaleString()} / km²</>
            ) : (
              <>Density: No data</>
            )}
          </div>
          {hoverInfo.areaSqKm ? (
            <div>Area: {hoverInfo.areaSqKm.toFixed(2)} km²</div>
          ) : (
            <div>Area: n/a</div>
          )}
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
              <div className={styles.summaryValue}>
                {summary.min !== null ? `${Math.round(summary.min).toLocaleString()} / km²` : 'n/a'}
              </div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryLabel}>Median density</div>
              <div className={styles.summaryValue}>
                {summary.median !== null ? `${Math.round(summary.median).toLocaleString()} / km²` : 'n/a'}
              </div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryLabel}>Max density</div>
              <div className={styles.summaryValue}>
                {summary.max !== null ? `${Math.round(summary.max).toLocaleString()} / km²` : 'n/a'}
              </div>
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
            <span className={styles.legendSwatch} style={{ background: 'rgba(237,248,251,0.8)' }} />
            <span className={styles.legendSwatch} style={{ background: 'rgba(191,211,230,0.86)' }} />
            <span className={styles.legendSwatch} style={{ background: 'rgba(158,188,218,0.9)' }} />
            <span className={styles.legendSwatch} style={{ background: 'rgba(117,107,177,0.92)' }} />
            <span className={styles.legendSwatch} style={{ background: 'rgba(84,39,143,0.94)' }} />
            <span className={styles.legendLabel}>Higher population density →</span>
          </div>
          <div className={styles.legendRow}>
            <span className={styles.legendSwatch} style={{ background: 'rgba(180,180,180,0.5)' }} />
            <span className={styles.legendLabel}>No data (Scotland / Northern Ireland)</span>
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
