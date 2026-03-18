import { useId, useCallback, useEffect, useRef } from 'react';
import { useTheme } from '@mui/material';
import maplibregl from 'maplibre-gl';
import { map } from './core/MapView';
import getSpeedColor from '../common/util/colors';
import { findFonts } from './core/mapUtil';
import { SpeedLegendControl } from './legend/MapSpeedLegend';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useAttributePreference } from '../common/util/preferences';
import { usePreference } from '../common/util/preferences';
import { formatAddress, formatTime } from '../common/util/formatter';

const MapRoutePoints = ({ positions, onClick, showSpeedControl }) => {
  const id = useId();
  const movingId = `${id}-moving`;
  const parkedId = `${id}-parked`;
  const startId = `${id}-start`;
  const endId = `${id}-end`;
  const theme = useTheme();
  const t = useTranslation();
  const speedUnit = useAttributePreference('speedUnit');
  const coordinateFormat = usePreference('coordinateFormat');
  const positionsRef = useRef(positions);
  const popupRef = useRef();

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  const onMouseEnter = () => (map.getCanvas().style.cursor = 'pointer');
  const onMouseLeave = () => (map.getCanvas().style.cursor = '');

  const showPopup = useCallback(
    (feature) => {
      const index = feature.properties.index;
      const positions = positionsRef.current;
      const position = positions[index];
      if (!position) {
        return;
      }

      const isParked = (p) => p?.attributes?.motion === false || p?.speed === 0;

      let start = index;
      while (start > 0 && isParked(positions[start - 1])) {
        start -= 1;
      }
      let end = index;
      while (end < positions.length - 1 && isParked(positions[end + 1])) {
        end += 1;
      }

      const startTime = positions[start]?.fixTime;
      const endTime = positions[end]?.fixTime;
      const durationMs =
        startTime && endTime ? Math.max(0, new Date(endTime) - new Date(startTime)) : 0;

      const durationSeconds = Math.floor(durationMs / 1000);
      const hh = String(Math.floor(durationSeconds / 3600)).padStart(2, '0');
      const mm = String(Math.floor((durationSeconds % 3600) / 60)).padStart(2, '0');
      const ss = String(durationSeconds % 60).padStart(2, '0');
      const duration = `${hh}:${mm}:${ss}`;

      const address = formatAddress(position, coordinateFormat);
      const time = formatTime(position.fixTime, 'seconds');

      const html = `
        <div style="font-family: Roboto, Arial, sans-serif; font-size: 12px; line-height: 1.35;">
          <div style="font-weight: 600; margin-bottom: 6px;">${t('reportStop')}</div>
          <div><b>${t('reportDuration')}:</b> ${duration}</div>
          <div style="margin-top: 6px;"><b>${t('positionAddress')}:</b> ${address}</div>
          <div style="margin-top: 6px;"><b>${t('positionFixTime')}:</b> ${time}</div>
        </div>
      `;

      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup({ closeButton: true, closeOnClick: true })
        .setLngLat(feature.geometry.coordinates)
        .setHTML(html)
        .addTo(map);
    },
    [coordinateFormat, t],
  );

  const onMovingClick = useCallback(
    (event) => {
      event.preventDefault();
      popupRef.current?.remove();
      const feature = event.features[0];
      if (onClick) {
        onClick(feature.properties.id, feature.properties.index);
      }
    },
    [onClick],
  );

  const onEndpointClick = useCallback(
    (event) => {
      event.preventDefault();
      popupRef.current?.remove();
      const feature = event.features[0];
      if (onClick) {
        onClick(feature.properties.id, feature.properties.index);
      }
    },
    [onClick],
  );

  const onParkedClick = useCallback(
    (event) => {
      event.preventDefault();
      const feature = event.features[0];
      if (onClick) {
        onClick(feature.properties.id, feature.properties.index);
      }
      showPopup(feature);
    },
    [onClick, showPopup],
  );

  useEffect(() => {
    map.addSource(id, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });

    map.addLayer({
      id: movingId,
      type: 'symbol',
      source: id,
      filter: ['!=', ['get', 'parked'], true],
      paint: {
        'text-color': ['get', 'color'],
      },
      layout: {
        'text-font': findFonts(map),
        'text-size': 12,
        'text-field': '▲',
        'text-allow-overlap': true,
        'text-rotate': ['get', 'rotation'],
      },
    });

    map.addLayer({
      id: parkedId,
      type: 'symbol',
      source: id,
      filter: ['==', ['get', 'parkedIcon'], true],
      layout: {
        'icon-image': 'park-neutral',
        'icon-size': 0.9,
        'icon-allow-overlap': true,
      },
    });

    map.addLayer({
      id: startId,
      type: 'symbol',
      source: id,
      filter: ['==', ['get', 'start'], true],
      layout: {
        'icon-image': 'start-neutral',
        'icon-size': 0.9,
        'icon-allow-overlap': true,
      },
    });

    map.addLayer({
      id: endId,
      type: 'symbol',
      source: id,
      filter: ['==', ['get', 'end'], true],
      layout: {
        'icon-image': 'finish-neutral',
        'icon-size': 0.9,
        'icon-allow-overlap': true,
      },
    });

    [movingId, parkedId, startId, endId].forEach((layerId) => {
      map.on('mouseenter', layerId, onMouseEnter);
      map.on('mouseleave', layerId, onMouseLeave);
    });
    map.on('click', movingId, onMovingClick);
    map.on('click', parkedId, onParkedClick);
    map.on('click', startId, onEndpointClick);
    map.on('click', endId, onEndpointClick);

    return () => {
      popupRef.current?.remove();
      popupRef.current = undefined;

      map.off('click', movingId, onMovingClick);
      map.off('click', parkedId, onParkedClick);
      map.off('click', startId, onEndpointClick);
      map.off('click', endId, onEndpointClick);

      [movingId, parkedId, startId, endId].forEach((layerId) => {
        map.off('mouseenter', layerId, onMouseEnter);
        map.off('mouseleave', layerId, onMouseLeave);
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
      });

      if (map.getSource(id)) {
        map.removeSource(id);
      }
    };
  }, [onMovingClick, onParkedClick, onEndpointClick]);

  useEffect(() => {
    const maxSpeed = positions.map((p) => p.speed).reduce((a, b) => Math.max(a, b), -Infinity);
    const minSpeed = positions.map((p) => p.speed).reduce((a, b) => Math.min(a, b), Infinity);

    const control = new SpeedLegendControl(positions, speedUnit, t, maxSpeed, minSpeed);
    if (showSpeedControl) {
      map.addControl(control, theme.direction === 'rtl' ? 'bottom-right' : 'bottom-left');
    }

    map.getSource(id)?.setData({
      type: 'FeatureCollection',
      features: (() => {
        const isParked = (p) => p?.attributes?.motion === false || p?.speed === 0;
        const parkedIcon = new Array(positions.length).fill(false);

        let i = 0;
        while (i < positions.length) {
          if (!isParked(positions[i])) {
            i += 1;
            continue;
          }

          const start = i;
          while (i < positions.length && isParked(positions[i])) {
            i += 1;
          }
          const end = i - 1;

          const startTime = positions[start]?.fixTime;
          const endTime = positions[end]?.fixTime;
          const durationMs =
            startTime && endTime ? Math.max(0, new Date(endTime) - new Date(startTime)) : 0;

          if (durationMs >= 60 * 1000) {
            for (let j = start; j <= end; j += 1) {
              parkedIcon[j] = true;
            }
          }
        }

        return positions.map((position, index) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [position.longitude, position.latitude],
          },
          properties: {
            index,
            id: position.id,
            rotation: position.course,
            parked: isParked(position),
            parkedIcon: parkedIcon[index],
            start: index === 0,
            end: index === positions.length - 1,
            color: getSpeedColor(position.speed, minSpeed, maxSpeed),
          },
        }));
      })(),
    });
    return () => map.removeControl(control);
  }, [positions, showSpeedControl, speedUnit, t]);

  return null;
};

export default MapRoutePoints;
