/**
 * Explore Page - Main Workbench
 * 
 * Primary working area with:
 * - Map canvas (UK or CZ regions)
 * - Inspector panel (Setup/Results/Notes)
 * - Overlay controls (metric, year, area, scenario)
 * - Time slider for year animation
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { GeoJsonLayer } from '@deck.gl/layers';
import type { Feature, Geometry } from 'geojson';

// Import existing map utilities
import { reprojectFeatureCollection27700ToWgs84 } from '../Map/reprojection';
import { reprojectFeatureCollection5514ToWgs84 } from '../CzMap/reprojectionCz';
import {
  augmentFeaturesWithPopulation,
  createPopulationColorScale,
  parsePopulationCsvByYear,
  precomputePopulationByYear
} from '../Map/populationData';
import { parseCzPopulationCsvByYear, precomputeCzPopulationByYear, augmentCzFeatures } from '../CzMap/czPopulationData';
import { filterFeaturesByZoom } from '../CzMap/zoomFiltering';
import { filterFeaturesByViewport, type BBox } from '../CzMap/viewportFiltering';

import type { RegionProperties } from '../../components/map/types';
import { DENSITY_COLORS, REGION_HOVER_COLOR, REGION_LINE_COLOR } from '../../components/map/constants';
import { natsService } from '../../services/nats';
import { GeoService } from '../../services/geo';

import styles from './Explore.module.css';

type MapRegionId = 'uk' | 'cz';
type InspectorTab = 'setup' | 'results' | 'notes';

interface HoverInfo {
  name: string;
  population: number | null;
  density: number | null;
  areaSqKm: number | null;
}

// Data URLs
const UK_REGIONS_URL = '/sample-data/uk-local-authorities.geojson';
const UK_POPULATION_CSV_URL = '/sample-data/2022 SNPP Population persons.csv';
const CZ_GEOJSON_URL = '/sample-data/cz-zsj.geojson';
const CZ_POP_CSV_URL = '/sample-data/sldb2021_obyv_byt_zsj.csv';

const isLikelyWgs84 = (coord: [number, number]) => Math.abs(coord[0]) <= 180 && Math.abs(coord[1]) <= 90;

export function Explore() {
  // Map state
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const deckOverlay = useRef<MapboxOverlay | null>(null);
  
  // View state
  const [region, setRegion] = useState<MapRegionId>('uk');
  const [lng, setLng] = useState(-2.5);
  const [lat, setLat] = useState(54.5);
  const [zoom, setZoom] = useState(5.5);
  const [viewportBBox, setViewportBBox] = useState<BBox>({ west: -10, south: 49, east: 5, north: 61 });
  
  // Layer visibility
  const [basemapVisible, setBasemapVisible] = useState(true);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  
  // Hover state
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  
  // UK data
  const [ukRegionsData, setUkRegionsData] = useState<Feature<Geometry, RegionProperties>[] | null>(null);
  const [ukPopulationByYear, setUkPopulationByYear] = useState<Map<string, Map<string, number>> | null>(null);
  const [ukPopulationYears, setUkPopulationYears] = useState<string[]>([]);
  const [ukPerYearFeatures, setUkPerYearFeatures] = useState<Map<string, Feature<Geometry, RegionProperties>[]>>(new Map());
  
  // CZ data
  const [czRegionsData, setCzRegionsData] = useState<Feature<Geometry, RegionProperties>[] | null>(null);
  const [czPopulationByYear, setCzPopulationByYear] = useState<Map<string, Map<string, number>> | null>(null);
  const [czPopulationYears, setCzPopulationYears] = useState<string[]>([]);
  const [czPerYearFeatures, setCzPerYearFeatures] = useState<Map<string, Feature<Geometry, RegionProperties>[]>>(new Map());
  
  // Combined state
  const [populationYear, setPopulationYear] = useState<string | null>(null);
  const [layerFeatures, setLayerFeatures] = useState<Feature<Geometry, RegionProperties>[] | null>(null);
  
  // Animation
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(500);
  
  // Loading states
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [regionsError, setRegionsError] = useState<string | null>(null);
  
  // Inspector
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('setup');
  const [inspectorVisible] = useState(true);
  
  // NATS/GeoService for CZ uploads
  const [natsConnected, setNatsConnected] = useState(false);
  const [uploadProcessing, setUploadProcessing] = useState(false);
  const geoServiceRef = useRef<GeoService | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Connect to NATS
  useEffect(() => {
    const connectNats = async () => {
      try {
        await natsService.connect();
        setNatsConnected(true);
        geoServiceRef.current = new GeoService(natsService);
      } catch (err) {
        console.error('[Explore] Failed to connect to NATS:', err);
        setNatsConnected(false);
      }
    };
    connectNats();
  }, []);

  // Load UK GeoJSON
  useEffect(() => {
    fetch(UK_REGIONS_URL)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(data => {
        const converted = reprojectFeatureCollection27700ToWgs84(data);
        setUkRegionsData(converted.features);
        setRegionsLoading(false);
        console.log(`[Explore] Loaded ${data.features.length} UK regions`);
      })
      .catch(error => {
        console.error('[Explore] Failed to load UK regions:', error);
        if (region === 'uk') {
          setRegionsError(error.message);
          setRegionsLoading(false);
        }
      });
  }, []);

  // Load UK population CSV
  useEffect(() => {
    fetch(UK_POPULATION_CSV_URL)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then(text => {
        const parsed = parsePopulationCsvByYear(text);
        const preferredYear = parsed.years.find(y => y === '2022') ?? parsed.years[0] ?? null;
        setUkPopulationYears(parsed.years);
        setUkPopulationByYear(parsed.byYear);
        if (region === 'uk' && preferredYear) {
          setPopulationYear(preferredYear);
        }
      })
      .catch(error => {
        console.error('[Explore] Failed to load UK population:', error);
      });
  }, []);

  // Load CZ GeoJSON
  useEffect(() => {
    const loadCzGeo = async () => {
      try {
        const res = await fetch(CZ_GEOJSON_URL);
        if (!res.ok) {
          throw new Error('CZ GeoJSON not found. Please upload a VFR XML file.');
        }
        const data = await res.json();
        const anyFeature = data.features?.[0];
        let converted = data;
        const firstCoord: [number, number] | undefined = anyFeature?.geometry?.coordinates?.[0]?.[0]?.[0];
        if (firstCoord && !isLikelyWgs84(firstCoord)) {
          converted = reprojectFeatureCollection5514ToWgs84(data);
        }
        setCzRegionsData(converted.features);
        console.log(`[Explore] Loaded ${data.features.length} CZ regions`);
      } catch (err: any) {
        console.warn('[Explore] CZ GeoJSON not available:', err.message);
      }
    };
    loadCzGeo();
  }, []);

  // Load CZ population CSV
  useEffect(() => {
    fetch(CZ_POP_CSV_URL)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then(text => {
        const parsed = parseCzPopulationCsvByYear(text);
        const preferredYear = parsed.years.find(y => y === '2021') ?? parsed.years[parsed.years.length - 1] ?? null;
        setCzPopulationYears(parsed.years);
        setCzPopulationByYear(parsed.byYear);
      })
      .catch(err => {
        console.warn('[Explore] CZ population not available:', err.message);
      });
  }, []);

  // Precompute UK features with population
  useEffect(() => {
    if (!ukRegionsData || !ukPopulationByYear) return;
    const precomputed = precomputePopulationByYear(ukRegionsData, ukPopulationByYear, DENSITY_COLORS);
    setUkPerYearFeatures(precomputed.perYearFeatures);
  }, [ukRegionsData, ukPopulationByYear]);

  // Precompute CZ features with population
  useEffect(() => {
    if (!czRegionsData || !czPopulationByYear) return;
    const precomputed = precomputeCzPopulationByYear(czRegionsData, czPopulationByYear, DENSITY_COLORS);
    setCzPerYearFeatures(precomputed.perYearFeatures);
  }, [czRegionsData, czPopulationByYear]);

  // Switch region and update map view
  const switchRegion = useCallback((newRegion: MapRegionId) => {
    setRegion(newRegion);
    setRegionsError(null);
    
    if (newRegion === 'uk') {
      if (!ukRegionsData) {
        setRegionsLoading(true);
      } else {
        setRegionsLoading(false);
      }
      const preferredYear = ukPopulationYears.find(y => y === '2022') ?? ukPopulationYears[0] ?? null;
      setPopulationYear(preferredYear);
      
      // Fly to UK
      if (map.current) {
        map.current.flyTo({
          center: [-2.5, 54.5],
          zoom: 5.5,
          duration: 1500
        });
      }
    } else {
      if (!czRegionsData) {
        setRegionsError('CZ GeoJSON not available. Please upload a VFR XML file.');
        setRegionsLoading(false);
      } else {
        setRegionsLoading(false);
      }
      const preferredYear = czPopulationYears.find(y => y === '2021') ?? czPopulationYears[czPopulationYears.length - 1] ?? null;
      setPopulationYear(preferredYear);
      
      // Fly to CZ
      if (map.current) {
        map.current.flyTo({
          center: [15.3, 49.8],
          zoom: 6,
          duration: 1500
        });
      }
    }
  }, [ukRegionsData, czRegionsData, ukPopulationYears, czPopulationYears]);

  // Update layer features when year or region changes
  useEffect(() => {
    if (!populationYear) return;
    
    if (region === 'uk') {
      const pre = ukPerYearFeatures.get(populationYear);
      if (pre) {
        setLayerFeatures(pre);
      } else if (ukRegionsData) {
        const popMap = ukPopulationByYear?.get(populationYear) ?? new Map();
        setLayerFeatures(augmentFeaturesWithPopulation(ukRegionsData, popMap));
      }
    } else {
      const pre = czPerYearFeatures.get(populationYear);
      if (pre) {
        setLayerFeatures(pre);
      } else if (czRegionsData) {
        const popMap = czPopulationByYear?.get(populationYear) ?? new Map();
        setLayerFeatures(augmentCzFeatures(czRegionsData, popMap));
      }
    }
  }, [region, populationYear, ukPerYearFeatures, czPerYearFeatures, ukRegionsData, czRegionsData, ukPopulationByYear, czPopulationByYear]);

  // Animation effect
  const populationYears = region === 'uk' ? ukPopulationYears : czPopulationYears;
  
  useEffect(() => {
    if (!isPlaying || populationYears.length === 0 || !populationYear) return;
    const idx = populationYears.indexOf(populationYear);
    const nextIdx = (idx + 1) % populationYears.length;
    const handle = setTimeout(() => {
      setPopulationYear(populationYears[nextIdx]);
    }, animationSpeed);
    return () => clearTimeout(handle);
  }, [isPlaying, populationYear, populationYears, animationSpeed]);

  // Filter features for CZ (zoom-based LOD)
  const filteredFeatures = useMemo(() => {
    if (!layerFeatures) return null;
    
    if (region === 'cz') {
      const zoomFiltered = filterFeaturesByZoom(layerFeatures, zoom);
      return filterFeaturesByViewport(zoomFiltered, viewportBBox, zoom);
    }
    
    return layerFeatures;
  }, [layerFeatures, region, zoom, viewportBBox]);

  // Color scale
  const densityColorScale = useMemo(() => {
    if (!filteredFeatures) return null;
    const densities = filteredFeatures.map(f => f.properties?.density ?? null);
    return createPopulationColorScale(densities, DENSITY_COLORS);
  }, [filteredFeatures]);

  // Summary stats
  const summary = useMemo(() => {
    if (!filteredFeatures) return null;
    const withData = filteredFeatures.filter(f => f.properties?.hasPopulationData);
    const withoutData = filteredFeatures.length - withData.length;
    const densities = withData
      .map(f => f.properties?.density)
      .filter((v): v is number => Number.isFinite(v as number))
      .sort((a, b) => a - b);
    
    if (!densities.length) {
      return { totalRegions: filteredFeatures.length, withData: withData.length, withoutData, min: null, median: null, max: null };
    }
    
    const min = densities[0];
    const max = densities[densities.length - 1];
    const mid = Math.floor(densities.length / 2);
    const median = densities.length % 2 === 0 ? (densities[mid - 1] + densities[mid]) / 2 : densities[mid];
    
    return { totalRegions: filteredFeatures.length, withData: withData.length, withoutData, min, median, max };
  }, [filteredFeatures]);

  const minYear = useMemo(() => (populationYears.length ? Number(populationYears[0]) : null), [populationYears]);
  const maxYear = useMemo(() => (populationYears.length ? Number(populationYears[populationYears.length - 1]) : null), [populationYears]);

  // Create deck.gl layers
  const getLayers = useCallback(() => {
    if (!overlayVisible || !filteredFeatures) return [];

    const nameProp = region === 'uk' ? 'LAD23NM' : 'uzemi_txt';

    return [
      new GeoJsonLayer<RegionProperties>({
        id: `${region}-regions`,
        data: filteredFeatures,
        pickable: true,
        stroked: true,
        filled: true,
        extruded: false,
        opacity: 0.85,
        lineWidthUnits: 'pixels',
        lineWidthMinPixels: region === 'uk' ? 1.2 : 1.0,
        getFillColor: (d: Feature<Geometry, RegionProperties>) => {
          const name = (d.properties as any)?.[nameProp] || '';
          const density = (d.properties as any)?.density ?? null;
          const hasData = (d.properties as any)?.hasPopulationData;
          const baseColor =
            densityColorScale && hasData !== undefined
              ? densityColorScale(density)
              : hasData
              ? [100, 149, 237, 160]
              : [180, 180, 180, 120];
          return name === hoveredRegion ? REGION_HOVER_COLOR : (baseColor as [number, number, number, number]);
        },
        getLineColor: REGION_LINE_COLOR,
        getLineWidth: region === 'uk' ? 1.2 : 1.0,
        onHover: (info) => {
          if (info.object) {
            const props = (info.object as Feature<Geometry, RegionProperties>).properties;
            setHoveredRegion((props as any)?.[nameProp] || null);
            setHoverInfo({
              name: (props as any)?.[nameProp] || '',
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
          getFillColor: [hoveredRegion, densityColorScale, filteredFeatures]
        }
      })
    ];
  }, [overlayVisible, filteredFeatures, hoveredRegion, densityColorScale, region]);

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
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
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
      } catch {
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

  // VFR file upload handler
  const handleFileUpload = async (file: File) => {
    if (!geoServiceRef.current) {
      setRegionsError('Geo service not initialized. Please wait for NATS connection.');
      return;
    }

    setUploadProcessing(true);
    setRegionsError(null);

    try {
      const xmlContent = await file.text();
      const response = await geoServiceRef.current.processVfrXml(xmlContent, {
        targetCrs: 'EPSG:4326',
        computeAreas: true,
        deduplicateByProperty: 'uzemi_kod',
      }, 180000);

      const converted = reprojectFeatureCollection5514ToWgs84(response.geojson);
      setCzRegionsData(converted.features);
      setRegionsError(null);
      setRegion('cz');
      
      if (map.current) {
        map.current.flyTo({
          center: [15.3, 49.8],
          zoom: 6,
          duration: 1500
        });
      }
    } catch (err: any) {
      setRegionsError(err.message || 'Failed to process VFR file');
    } finally {
      setUploadProcessing(false);
    }
  };

  return (
    <div className={styles.explore}>
      {/* Overlay Controls */}
      <div className={styles.overlay}>
        <div className={styles.overlayGroup}>
          <span className={styles.overlayLabel}>Region</span>
          <div className={styles.regionToggle}>
            <button
              className={`${styles.regionOption} ${region === 'uk' ? styles.active : ''}`}
              onClick={() => switchRegion('uk')}
            >
              🇬🇧 UK
            </button>
            <button
              className={`${styles.regionOption} ${region === 'cz' ? styles.active : ''}`}
              onClick={() => switchRegion('cz')}
            >
              🇨🇿 CZ
            </button>
          </div>
        </div>

        <div className={styles.overlaySeparator} />

        <div className={styles.overlayGroup}>
          <span className={styles.overlayLabel}>Metric</span>
          <select className={styles.overlaySelect}>
            <option value="density">Population Density</option>
            <option value="population" disabled>Total Population</option>
            <option value="growth" disabled>Growth Rate</option>
          </select>
        </div>

        <div className={styles.overlaySeparator} />

        <div className={styles.overlayGroup}>
          <span className={styles.overlayLabel}>Scenario</span>
          <select className={styles.overlaySelect}>
            <option value="baseline">Baseline</option>
          </select>
        </div>

        {region === 'cz' && (
          <>
            <div className={styles.overlaySeparator} />
            <button
              className={styles.runButton}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadProcessing || !natsConnected}
            >
              {uploadProcessing ? '⏳ Processing...' : !natsConnected ? '🔌 Connecting...' : '📂 Upload VFR'}
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
          </>
        )}

        <button className={styles.runButton} disabled>
          ▶ Run Projection
        </button>
      </div>

      {/* Error Banner */}
      {regionsError && (
        <div className={styles.errorBanner}>
          <span className={styles.errorIcon}>⚠️</span>
          {regionsError}
        </div>
      )}

      {/* Main Content */}
      <div className={styles.content}>
        {/* Map Area */}
        <div className={styles.mapArea}>
          <div className={styles.mapContainer}>
            <div ref={mapContainer} className={styles.mapCanvas} />
            
            {/* Loading Overlay */}
            {regionsLoading && (
              <div className={styles.loadingOverlay}>
                <div className={styles.loadingSpinner}>
                  <div className={styles.spinner} />
                  <span className={styles.loadingText}>Loading regions...</span>
                </div>
              </div>
            )}
            
            {/* Map Controls */}
            <div className={styles.mapControls}>
              <button
                className={`${styles.layerButton} ${basemapVisible ? styles.active : ''}`}
                onClick={() => setBasemapVisible(!basemapVisible)}
                title="Toggle basemap"
              >
                🗺️
              </button>
              <button
                className={`${styles.layerButton} ${overlayVisible ? styles.active : ''}`}
                onClick={() => setOverlayVisible(!overlayVisible)}
                title="Toggle regions overlay"
              >
                📊
              </button>
            </div>

            {/* Legend */}
            <div className={styles.legendPanel}>
              <div className={styles.legendTitle}>Population Density</div>
              <div className={styles.legendScale}>
                {DENSITY_COLORS.map((c, idx) => (
                  <div
                    key={idx}
                    className={styles.legendSwatch}
                    style={{ backgroundColor: `rgba(${c[0]},${c[1]},${c[2]},${c[3] / 255})` }}
                  />
                ))}
              </div>
              <div className={styles.legendLabels}>
                <span>Low</span>
                <span>High</span>
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendDot} style={{ backgroundColor: 'rgba(180,180,180,0.5)' }} />
                <span>No data</span>
              </div>
            </div>

            {/* Hover Tooltip */}
            {hoverInfo && (
              <div className={`${styles.hoverTooltip} ${!inspectorVisible ? styles.noInspector : ''}`}>
                <div className={styles.tooltipTitle}>
                  📍 {hoverInfo.name}
                </div>
                <div className={styles.tooltipRow}>
                  <span>Population</span>
                  <span className={styles.tooltipValue}>
                    {hoverInfo.population !== null ? Math.round(hoverInfo.population).toLocaleString() : 'No data'}
                  </span>
                </div>
                <div className={styles.tooltipRow}>
                  <span>Density</span>
                  <span className={styles.tooltipValue}>
                    {hoverInfo.density !== null ? `${Math.round(hoverInfo.density).toLocaleString()} / km²` : 'No data'}
                  </span>
                </div>
                {hoverInfo.areaSqKm && (
                  <div className={styles.tooltipRow}>
                    <span>Area</span>
                    <span className={styles.tooltipValue}>{hoverInfo.areaSqKm.toFixed(2)} km²</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Time Slider */}
          {populationYears.length > 0 && populationYear && (
            <div className={`${styles.timeSliderOverlay} ${!inspectorVisible ? styles.noInspector : ''}`}>
              <button
                className={styles.playButton}
                onClick={() => setIsPlaying(!isPlaying)}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? '❚❚' : '▶'}
              </button>
              <span className={styles.yearLabel}>
                Year: <span className={styles.yearValue}>{populationYear}</span>
              </span>
              <span className={styles.yearMin}>{minYear}</span>
              <input
                type="range"
                className={styles.yearSlider}
                min={minYear ?? 0}
                max={maxYear ?? 0}
                step={1}
                value={Number(populationYear)}
                onChange={(e) => setPopulationYear(String(e.target.value))}
              />
              <span className={styles.yearMax}>{maxYear}</span>
            </div>
          )}
        </div>

        {/* Inspector Panel */}
        {inspectorVisible && (
          <div className={styles.inspector}>
            <div className={styles.inspectorTabs}>
              <button
                className={`${styles.inspectorTab} ${inspectorTab === 'setup' ? styles.active : ''}`}
                onClick={() => setInspectorTab('setup')}
              >
                Setup
              </button>
              <button
                className={`${styles.inspectorTab} ${inspectorTab === 'results' ? styles.active : ''}`}
                onClick={() => setInspectorTab('results')}
              >
                Results
              </button>
              <button
                className={`${styles.inspectorTab} ${inspectorTab === 'notes' ? styles.active : ''}`}
                onClick={() => setInspectorTab('notes')}
              >
                Notes
              </button>
            </div>

            <div className={styles.inspectorContent}>
              {inspectorTab === 'setup' && (
                <>
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Dataset</h3>
                    <div className={styles.sectionContent}>
                      <div className={styles.field}>
                        <span className={styles.fieldLabel}>Region</span>
                        <span className={styles.fieldValue}>
                          {region === 'uk' ? 'UK Local Authorities' : 'CZ Microregions (ZSJ)'}
                        </span>
                      </div>
                      <div className={styles.field}>
                        <span className={styles.fieldLabel}>Source</span>
                        <span className={styles.fieldValue}>
                          {region === 'uk' ? 'ONS SNPP 2022' : 'SLDB 2021'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Geography</h3>
                    <div className={styles.sectionContent}>
                      <div className={styles.field}>
                        <span className={styles.fieldLabel}>Unit</span>
                        <span className={styles.fieldValue}>
                          {region === 'uk' ? 'Local Authority District' : 'Základní sídelní jednotka'}
                        </span>
                      </div>
                      <div className={styles.field}>
                        <span className={styles.fieldLabel}>View</span>
                        <span className={styles.fieldValue}>
                          {lng.toFixed(2)}°, {lat.toFixed(2)}° @ z{zoom.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Projection</h3>
                    <div className={styles.sectionContent}>
                      <div className={styles.field}>
                        <span className={styles.fieldLabel}>Year Range</span>
                        <span className={styles.fieldValue}>
                          {minYear} – {maxYear}
                        </span>
                      </div>
                      <div className={styles.field}>
                        <span className={styles.fieldLabel}>Current Year</span>
                        <span className={styles.fieldValue}>{populationYear}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {inspectorTab === 'results' && summary && (
                <>
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Summary Statistics</h3>
                    <div className={styles.statsGrid}>
                      <div className={styles.statCard}>
                        <div className={styles.statLabel}>Total Regions</div>
                        <div className={styles.statValue}>{summary.totalRegions.toLocaleString()}</div>
                      </div>
                      <div className={styles.statCard}>
                        <div className={styles.statLabel}>With Data</div>
                        <div className={styles.statValue}>{summary.withData.toLocaleString()}</div>
                      </div>
                      <div className={styles.statCard}>
                        <div className={styles.statLabel}>Min Density</div>
                        <div className={styles.statValue}>
                          {summary.min !== null ? `${Math.round(summary.min).toLocaleString()} / km²` : '—'}
                        </div>
                      </div>
                      <div className={styles.statCard}>
                        <div className={styles.statLabel}>Median Density</div>
                        <div className={styles.statValue}>
                          {summary.median !== null ? `${Math.round(summary.median).toLocaleString()} / km²` : '—'}
                        </div>
                      </div>
                      <div className={styles.statCard}>
                        <div className={styles.statLabel}>Max Density</div>
                        <div className={styles.statValue}>
                          {summary.max !== null ? `${Math.round(summary.max).toLocaleString()} / km²` : '—'}
                        </div>
                      </div>
                      <div className={styles.statCard}>
                        <div className={styles.statLabel}>No Data</div>
                        <div className={styles.statValue}>{summary.withoutData.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {inspectorTab === 'notes' && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Notes</h3>
                  <div className={styles.sectionContent}>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                      No notes for this analysis yet. Notes and annotations will appear here.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { Explore as ExplorePlaceholder };
