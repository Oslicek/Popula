import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import styles from './Map.module.css';

export function Map() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [lng, setLng] = useState(14.4378); // Prague longitude
  const [lat, setLat] = useState(50.0755); // Prague latitude
  const [zoom, setZoom] = useState(4);

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
      </div>
      
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
        </ul>
      </div>
    </div>
  );
}

