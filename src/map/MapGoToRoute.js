import { useId, useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import { map } from './core/MapView';

const ROUTE_COLOR = '#00e5ff';
const ORIGIN_COLOR = '#29b6f6';

const MapGoToRoute = ({ coordinates, origin }) => {
  const id = useId();
  const lineId = `${id}-line`;
  const casingId = `${id}-casing`;
  const originId = `${id}-origin`;

  useEffect(() => {
    map.addSource(id, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });
    map.addLayer({
      source: id,
      id: casingId,
      type: 'line',
      filter: ['==', ['geometry-type'], 'LineString'],
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#0a1628',
        'line-width': 8,
        'line-opacity': 0.55,
      },
    });
    map.addLayer({
      source: id,
      id: lineId,
      type: 'line',
      filter: ['==', ['geometry-type'], 'LineString'],
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': ROUTE_COLOR,
        'line-width': 4,
        'line-opacity': 0.95,
      },
    });
    map.addLayer({
      source: id,
      id: originId,
      type: 'circle',
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-radius': 8,
        'circle-color': ORIGIN_COLOR,
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff',
      },
    });

    return () => {
      if (map.getLayer(originId)) {
        map.removeLayer(originId);
      }
      if (map.getLayer(lineId)) {
        map.removeLayer(lineId);
      }
      if (map.getLayer(casingId)) {
        map.removeLayer(casingId);
      }
      if (map.getSource(id)) {
        map.removeSource(id);
      }
    };
  }, []);

  useEffect(() => {
    if (!coordinates?.length) {
      return;
    }
    const features = [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates,
        },
      },
    ];
    if (origin) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [origin.longitude, origin.latitude],
        },
      });
    }
    map.getSource(id)?.setData({
      type: 'FeatureCollection',
      features,
    });

    const bounds = coordinates.reduce(
      (next, item) => next.extend(item),
      new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
    );
    const canvas = map.getCanvas();
    map.fitBounds(bounds, {
      padding: Math.min(canvas.width, canvas.height) * 0.12,
      duration: 800,
    });
  }, [coordinates, origin]);

  return null;
};

export default MapGoToRoute;
