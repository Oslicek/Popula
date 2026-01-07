import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { GeoJsonLayer } from '@deck.gl/layers';
import type { Feature, Geometry } from 'geojson';
import styles from './Map.module.css';

// UK Local Authority GeoJSON path
const UK_REGIONS_URL = '/sample-data/uk-local-authorities.geojson';

// Color scale for regions (semi-transparent)
const REGION_FILL_COLOR: [number, number, number, number] = [64, 156, 255, 100];
const REGION_LINE_COLOR: [number, number, number, number] = [255, 255, 255, 200];
const REGION_HOVER_COLOR: [number, number, number, number] = [255, 180, 64, 180];

interface RegionProperties {
  LAD23CD?: string;
  LAD23NM?: string;
  LAD23NMW?: string;
  BNG_E?: number;
  BNG_N?: number;
  LONG?: number;
  LAT?: number;
  GlobalID?: string;
  [key: string]: unknown;
}

export function Map() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const deckOverlay = useRef<MapboxOverlay | null>(null);
  const [lng, setLng] = useState(-2.5); // UK center longitude
  const [lat, setLat] = useState(54.5); // UK center latitude
  const [zoom, setZoom] = useState(5.5);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [regionsData, setRegionsData] = useState<Feature<Geometry, RegionProperties>[] | null>(null);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [regionsError, setRegionsError] = useState<string | null>(null);

  // Load GeoJSON data
  useEffect(() => {
    fetch(UK_REGIONS_URL)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(data => {
        setRegionsData(data.features);
        setRegionsLoading(false);
        console.log(`[Map] Loaded ${data.features.length} regions`);
      })
      .catch(error => {
        console.error('[Map] Failed to load regions:', error);
        setRegionsError(error.message);
        setRegionsLoading(false);
      });
  }, []);

  // Create deck.gl layers
  const getLayers = useCallback(() => {
    if (!regionsData) return [];

    return [
      new GeoJsonLayer<RegionProperties>({
        id: 'uk-regions',
        data: regionsData,
        pickable: true,
        stroked: true,
        filled: true,
        extruded: false,
        lineWidthMinPixels: 1,
        getFillColor: (d: Feature<Geometry, RegionProperties>) => {
          const name = d.properties?.LAD23NM || '';
          return name === hoveredRegion ? REGION_HOVER_COLOR : REGION_FILL_COLOR;
        },
        getLineColor: REGION_LINE_COLOR,
        getLineWidth: 1,
        onHover: (info) => {
          if (info.object) {
            const props = (info.object as Feature<Geometry, RegionProperties>).properties;
            setHoveredRegion(props?.LAD23NM || null);
          } else {
            setHoveredRegion(null);
          }
        },
        updateTriggers: {
          getFillColor: [hoveredRegion]
        }
      })
    ];
  }, [regionsData, hoveredRegion]);

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
      </div>
      
      {hoveredRegion && (
        <div className={styles.tooltip}>
          <strong>📍 {hoveredRegion}</strong>
        </div>
      )}
      
      <div className={styles.mapWrapper}>
        <div ref={mapContainer} className={styles.mapContainer} />
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
