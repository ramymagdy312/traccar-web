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

const generateStopIcon = (number) => {
  const size = 36;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.shadowColor = 'rgba(211,47,47,0.35)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;

  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.fillStyle = '#d32f2f';
  ctx.fill();
  ctx.shadowColor = 'transparent';

  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${number > 9 ? 13 : 15}px Inter, Roboto, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(number), size / 2, size / 2 + 0.5);

  return ctx.getImageData(0, 0, size, size);
};

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
  const stopsRef = useRef([]);
  const popupRef = useRef();
  const addedImagesRef = useRef([]);

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  const onMouseEnter = () => (map.getCanvas().style.cursor = 'pointer');
  const onMouseLeave = () => (map.getCanvas().style.cursor = '');

  const showPopup = useCallback(
    (feature) => {
      const stopNumber = feature.properties.stopNumber;
      const stopIdx = stopNumber - 1;
      const stops = stopsRef.current;
      const stop = stops[stopIdx];
      if (!stop) return;

      const positions = positionsRef.current;
      const position = positions[stop.startIdx];
      if (!position) return;

      const durationSeconds = Math.floor(stop.durationMs / 1000);
      const hh = String(Math.floor(durationSeconds / 3600)).padStart(2, '0');
      const mm = String(Math.floor((durationSeconds % 3600) / 60)).padStart(2, '0');
      const ss = String(durationSeconds % 60).padStart(2, '0');
      const duration = `${hh}:${mm}:${ss}`;

      const address = formatAddress(position, coordinateFormat);
      const startTimeStr = formatTime(positions[stop.startIdx]?.fixTime, 'seconds');
      const endTimeStr = formatTime(positions[stop.endIdx]?.fixTime, 'seconds');

      const html = `
        <div style="font-family: 'Inter', Roboto, Arial, sans-serif; font-size: 12px; line-height: 1.5; min-width: 180px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid rgba(0,0,0,0.08);">
            <div style="width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #d32f2f, #f44336); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px;">${stopNumber}</div>
            <div>
              <div style="font-weight: 700; font-size: 13px; color: #d32f2f;">${t('reportStops')} #${stopNumber}</div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 3px 0;">
            <span style="color: #666;">&#9202; ${t('reportDuration')}:</span>
            <b>${duration}</b>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 3px 0;">
            <span style="color: #666;">&#9200; ${t('reportStartTime')}:</span>
            <b>${startTimeStr}</b>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 3px 0;">
            <span style="color: #666;">&#9201; ${t('reportEndTime')}:</span>
            <b>${endTimeStr}</b>
          </div>
          <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(0,0,0,0.08);">
            <div style="color: #666; margin-bottom: 2px;">&#128205; ${t('positionAddress')}:</div>
            <div style="font-weight: 500;">${address}</div>
          </div>
        </div>
      `;

      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: '280px' })
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
      data: { type: 'FeatureCollection', features: [] },
    });

    map.addLayer({
      id: movingId,
      type: 'symbol',
      source: id,
      filter: ['all', ['!=', ['get', 'parked'], true], ['!=', ['get', 'stopMarker'], true]],
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
      filter: ['==', ['get', 'stopMarker'], true],
      layout: {
        'icon-image': ['get', 'stopImageId'],
        'icon-size': 1,
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

    const allLayers = [movingId, parkedId, startId, endId];
    allLayers.forEach((layerId) => {
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

      allLayers.forEach((layerId) => {
        map.off('mouseenter', layerId, onMouseEnter);
        map.off('mouseleave', layerId, onMouseLeave);
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
      });

      if (map.getSource(id)) {
        map.removeSource(id);
      }

      addedImagesRef.current.forEach((imgId) => {
        if (map.hasImage(imgId)) map.removeImage(imgId);
      });
      addedImagesRef.current = [];
    };
  }, [onMovingClick, onParkedClick, onEndpointClick]);

  useEffect(() => {
    const maxSpeed = positions.map((p) => p.speed).reduce((a, b) => Math.max(a, b), -Infinity);
    const minSpeed = positions.map((p) => p.speed).reduce((a, b) => Math.min(a, b), Infinity);

    const control = new SpeedLegendControl(positions, speedUnit, t, maxSpeed, minSpeed);
    if (showSpeedControl) {
      map.addControl(control, theme.direction === 'rtl' ? 'bottom-right' : 'bottom-left');
    }

    addedImagesRef.current.forEach((imgId) => {
      if (map.hasImage(imgId)) map.removeImage(imgId);
    });
    addedImagesRef.current = [];

    const isParked = (p) => p?.attributes?.motion === false || p?.speed === 0;
    const stops = [];
    const stopMarkerIdx = new Set();
    const stopNumberMap = {};

    let i = 0;
    while (i < positions.length) {
      if (!isParked(positions[i])) {
        i += 1;
        continue;
      }

      const startIdx = i;
      while (i < positions.length && isParked(positions[i])) {
        i += 1;
      }
      const endIdx = i - 1;

      const startTime = positions[startIdx]?.fixTime;
      const endTime = positions[endIdx]?.fixTime;
      const durationMs =
        startTime && endTime ? Math.max(0, new Date(endTime) - new Date(startTime)) : 0;

      if (durationMs >= 60 * 1000) {
        const stopNum = stops.length + 1;
        stops.push({ startIdx, endIdx, durationMs, number: stopNum });
        stopMarkerIdx.add(startIdx);
        stopNumberMap[startIdx] = stopNum;

        const imageId = `stop-icon-${stopNum}`;
        if (!map.hasImage(imageId)) {
          const icon = generateStopIcon(stopNum);
          map.addImage(imageId, icon);
          addedImagesRef.current.push(imageId);
        }
      }
    }

    stopsRef.current = stops;

    map.getSource(id)?.setData({
      type: 'FeatureCollection',
      features: positions.map((position, index) => ({
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
          stopMarker: stopMarkerIdx.has(index),
          stopNumber: stopNumberMap[index] || 0,
          stopImageId: stopNumberMap[index] ? `stop-icon-${stopNumberMap[index]}` : '',
          start: index === 0,
          end: index === positions.length - 1,
          color: getSpeedColor(position.speed, minSpeed, maxSpeed),
        },
      })),
    });
    return () => map.removeControl(control);
  }, [positions, showSpeedControl, speedUnit, t]);

  return null;
};

export default MapRoutePoints;
