import { useState, useEffect, useRef, useCallback, useMemo, useId, startTransition } from 'react';
import {
  Box,
  IconButton,
  Paper,
  Slider,
  Toolbar,
  Tooltip,
  Typography,
  LinearProgress,
  Button,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { makeStyles } from 'tss-react/mui';
import TuneIcon from '@mui/icons-material/Tune';
import DownloadIcon from '@mui/icons-material/Download';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import SpeedIcon from '@mui/icons-material/Speed';
import RouteIcon from '@mui/icons-material/Route';
import TimerIcon from '@mui/icons-material/Timer';
import LocalParkingIcon from '@mui/icons-material/LocalParking';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import HeightIcon from '@mui/icons-material/Height';
import ExploreIcon from '@mui/icons-material/Explore';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import MapView, { map } from '../map/core/MapView';
import MapRoutePath from '../map/MapRoutePath';
import MapRoutePoints from '../map/MapRoutePoints';
import { mapIconKey } from '../map/core/preloadImages';
import { findFonts } from '../map/core/mapUtil';
import { formatTime, formatSpeed, formatDistance, formatAddress } from '../common/util/formatter';
import ReportFilter, { updateReportParams } from '../reports/components/ReportFilter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useCatch } from '../reactHelper';
import MapCamera from '../map/MapCamera';
import MapGeofence from '../map/MapGeofence';
import StatusCard from '../common/components/StatusCard';
import MapScale from '../map/MapScale';
import BackIcon from '../common/components/BackIcon';
import fetchOrThrow from '../common/util/fetchOrThrow';
import MapOverlay from '../map/overlay/MapOverlay';
import { useAttributePreference, usePreference } from '../common/util/preferences';

const useStyles = makeStyles()((theme) => ({
  root: {
    height: '100%',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    zIndex: 3,
    left: 0,
    top: 0,
    margin: theme.spacing(1.5),
    width: theme.dimensions.drawerWidthDesktop,
    maxHeight: `calc(100% - ${theme.spacing(3)})`,
    [theme.breakpoints.down('md')]: {
      width: '100%',
      margin: 0,
      maxHeight: '50%',
    },
  },
  header: {
    borderRadius: '12px 12px 0 0',
    overflow: 'hidden',
  },
  headerToolbar: {
    background: theme.palette.mode === 'dark'
      ? 'linear-gradient(135deg, #0d2137 0%, #1a3a5c 100%)'
      : 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
    color: '#ffffff',
    minHeight: '52px !important',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(1.5),
    gap: theme.spacing(1.5),
    overflowY: 'auto',
    flex: 1,
    borderRadius: '0 0 12px 12px',
    '&::-webkit-scrollbar': { width: 4 },
    '&::-webkit-scrollbar-thumb': { background: 'rgba(0,0,0,0.1)', borderRadius: 2 },
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: theme.spacing(1),
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(1, 1.25),
    borderRadius: 12,
    background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
    border: `1px solid ${theme.palette.divider}`,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statValue: {
    fontWeight: 700,
    fontSize: '0.8rem',
    lineHeight: 1.2,
  },
  statLabel: {
    fontSize: '0.6rem',
    color: theme.palette.text.secondary,
    fontWeight: 500,
  },
  playerSection: {
    background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
    borderRadius: 12,
    padding: theme.spacing(1.5),
    border: `1px solid ${theme.palette.divider}`,
  },
  playerControls: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    marginTop: theme.spacing(0.5),
  },
  playButton: {
    width: 44,
    height: 44,
    background: theme.palette.mode === 'dark'
      ? 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)'
      : 'linear-gradient(135deg, #1565c0 0%, #42a5f5 100%)',
    color: '#fff',
    boxShadow: '0 4px 12px rgba(21,101,192,0.3)',
    '&:hover': {
      background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)',
    },
    '&.Mui-disabled': {
      background: theme.palette.action.disabledBackground,
      color: theme.palette.action.disabled,
      boxShadow: 'none',
    },
  },
  timeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing(0.5),
  },
  timeText: {
    fontSize: '0.65rem',
    color: theme.palette.text.secondary,
    fontWeight: 500,
  },
  posCounter: {
    fontSize: '0.65rem',
    color: theme.palette.text.secondary,
    textAlign: 'center',
    fontWeight: 600,
  },
  speedRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    marginTop: theme.spacing(1),
    flexWrap: 'wrap',
  },
  speedButton: {
    minWidth: 34,
    height: 26,
    padding: theme.spacing(0, 0.75),
    borderRadius: 8,
    fontSize: '0.65rem',
    fontWeight: 700,
    lineHeight: 1,
    color: theme.palette.text.secondary,
    background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    boxShadow: 'none',
    '&:hover': {
      background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(21,101,192,0.08)',
      boxShadow: 'none',
    },
  },
  speedButtonActive: {
    color: '#fff',
    background: theme.palette.mode === 'dark'
      ? 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)'
      : 'linear-gradient(135deg, #1565c0 0%, #42a5f5 100%)',
    boxShadow: '0 2px 8px rgba(21,101,192,0.28)',
    '&:hover': {
      background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)',
      boxShadow: '0 2px 8px rgba(21,101,192,0.28)',
    },
  },
  liveCard: {
    borderRadius: 12,
    padding: theme.spacing(1.25),
    border: `1px solid ${theme.palette.divider}`,
    background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
  },
  liveTitle: {
    fontWeight: 700,
    fontSize: '0.7rem',
    color: theme.palette.primary.main,
    marginBottom: theme.spacing(0.75),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  },
  liveRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(0.35, 0),
    '&:not(:last-child)': {
      borderBottom: `1px solid ${theme.palette.divider}`,
    },
  },
  liveLabel: {
    fontSize: '0.65rem',
    color: theme.palette.text.secondary,
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  },
  liveValue: {
    fontSize: '0.7rem',
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  speedBar: {
    height: 6,
    borderRadius: 3,
    marginTop: theme.spacing(0.5),
  },
  deviceChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    padding: theme.spacing(0.4, 1.2),
    borderRadius: 20,
    background: theme.palette.mode === 'dark'
      ? 'rgba(92,158,255,0.12)'
      : 'rgba(21,101,192,0.08)',
    border: `1px solid ${theme.palette.primary.main}30`,
    maxWidth: '100%',
  },
  deviceChipText: {
    fontWeight: 700,
    fontSize: '0.78rem',
    color: theme.palette.primary.main,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
}));

const lerp = (from, to, t) => from + (to - from) * t;

const lerpAngle = (fromDeg, toDeg, t) => {
  const from = ((fromDeg % 360) + 360) % 360;
  const to = ((toDeg % 360) + 360) % 360;
  let diff = to - from;
  if (diff > 180) {
    diff -= 360;
  } else if (diff < -180) {
    diff += 360;
  }
  return ((from + diff * t) + 360) % 360;
};

const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;
const EARTH_M = 6371000;
const STATIONARY_SPEED = 0.5;
const PARK_SNAP_M = 55;
const SPIKE_NEIGHBOR_M = 28;
const SPIKE_OFFSET_M = 42;
const UI_SYNC_MS = 180;
const HEADING_SMOOTH_MS = 140;

const distanceMeters = (lat1, lng1, lat2, lng2) => {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const dφ = toRad(lat2 - lat1);
  const dλ = toRad(lng2 - lng1);
  const s = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(s)));
};

const isStationary = (position) => {
  if (position?.attributes?.motion === false) {
    return true;
  }
  return (position?.speed || 0) <= STATIONARY_SPEED;
};

const bearingBetweenCoords = (lat1, lng1, lat2, lng2) => {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lng2 - lng1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

const catmullRom2D = (p0, p1, p2, p3, t, alpha = 0.5) => {
  const getT = (ti, a, b) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return ti + (dx * dx + dy * dy) ** (alpha * 0.5);
  };
  const lerpPt = (a, b, ta, tb, tv) => {
    const span = tb - ta;
    const f = Math.abs(span) < 1e-12 ? 0 : (tv - ta) / span;
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  };
  const t0 = 0;
  const t1 = Math.max(t0 + 1e-6, getT(t0, p0, p1));
  const t2 = Math.max(t1 + 1e-6, getT(t1, p1, p2));
  const t3 = Math.max(t2 + 1e-6, getT(t2, p2, p3));
  const tv = t1 + (t2 - t1) * t;
  const a1 = lerpPt(p0, p1, t0, t1, tv);
  const a2 = lerpPt(p1, p2, t1, t2, tv);
  const a3 = lerpPt(p2, p3, t2, t3, tv);
  const b1 = lerpPt(a1, a2, t0, t2, tv);
  const b2 = lerpPt(a2, a3, t1, t3, tv);
  return lerpPt(b1, b2, t1, t2, tv);
};

const prepareSmoothTrack = (positions) => {
  const n = positions.length;
  const lats = positions.map((position) => position.latitude);
  const lngs = positions.map((position) => position.longitude);
  if (n === 0) {
    return { lats, lngs };
  }

  for (let i = 1; i < n - 1; i += 1) {
    const neighbor = distanceMeters(lats[i - 1], lngs[i - 1], lats[i + 1], lngs[i + 1]);
    const prev = distanceMeters(lats[i - 1], lngs[i - 1], lats[i], lngs[i]);
    const next = distanceMeters(lats[i], lngs[i], lats[i + 1], lngs[i + 1]);
    if (prev > SPIKE_OFFSET_M && next > SPIKE_OFFSET_M && neighbor < SPIKE_NEIGHBOR_M) {
      lats[i] = (lats[i - 1] + lats[i + 1]) / 2;
      lngs[i] = (lngs[i - 1] + lngs[i + 1]) / 2;
    }
  }

  let i = 0;
  while (i < n) {
    if (!isStationary(positions[i])) {
      i += 1;
      continue;
    }
    let j = i;
    while (j + 1 < n && isStationary(positions[j + 1])) {
      j += 1;
    }
    let minLat = lats[i];
    let maxLat = lats[i];
    let minLng = lngs[i];
    let maxLng = lngs[i];
    let sumLat = 0;
    let sumLng = 0;
    for (let k = i; k <= j; k += 1) {
      minLat = Math.min(minLat, lats[k]);
      maxLat = Math.max(maxLat, lats[k]);
      minLng = Math.min(minLng, lngs[k]);
      maxLng = Math.max(maxLng, lngs[k]);
      sumLat += lats[k];
      sumLng += lngs[k];
    }
    if (distanceMeters(minLat, minLng, maxLat, maxLng) <= PARK_SNAP_M) {
      const clat = sumLat / (j - i + 1);
      const clng = sumLng / (j - i + 1);
      for (let k = i; k <= j; k += 1) {
        lats[k] = clat;
        lngs[k] = clng;
      }
    }
    i = j + 1;
  }

  return { lats, lngs };
};

const pathPoint = (path, index, lngScale) => ({
  x: path.lngs[index] * lngScale,
  y: path.lats[index],
});

const samplePath = (path, index, t, lngScale) => {
  const last = path.lats.length - 1;
  const i0 = Math.max(0, index - 1);
  const i1 = index;
  const i2 = Math.min(last, index + 1);
  const i3 = Math.min(last, index + 2);
  const point = catmullRom2D(
    pathPoint(path, i0, lngScale),
    pathPoint(path, i1, lngScale),
    pathPoint(path, i2, lngScale),
    pathPoint(path, i3, lngScale),
    t,
  );
  return {
    latitude: point.y,
    longitude: lngScale === 0 ? path.lngs[i1] : point.x / lngScale,
  };
};

const findSegmentIndex = (times, time) => {
  const last = times.length - 1;
  if (time <= times[0]) {
    return 0;
  }
  if (time >= times[last]) {
    return Math.max(0, last - 1);
  }
  let lo = 0;
  let hi = last - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= time && time <= times[mid + 1]) {
      return mid;
    }
    if (times[mid] < time) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return Math.max(0, Math.min(last - 1, lo));
};

const interpolatePosition = (positions, times, path, time) => {
  const last = positions.length - 1;
  if (last < 0 || !path?.lats?.length) {
    return { position: null, fromIndex: 0, atEnd: true };
  }
  const lngScale = Math.max(Math.cos(toRad(path.lats[0] || 0)), 0.2);
  if (last === 0 || time <= times[0]) {
    return {
      position: {
        ...positions[0],
        latitude: path.lats[0],
        longitude: path.lngs[0],
      },
      fromIndex: 0,
      atEnd: false,
    };
  }
  if (time >= times[last]) {
    return {
      position: {
        ...positions[last],
        latitude: path.lats[last],
        longitude: path.lngs[last],
      },
      fromIndex: last,
      atEnd: true,
    };
  }
  const i = findSegmentIndex(times, time);
  const span = times[i + 1] - times[i];
  const t = span > 0 ? Math.min(1, Math.max(0, (time - times[i]) / span)) : 1;
  const from = positions[i];
  const to = positions[i + 1];
  const sampled = samplePath(path, i, t, lngScale);
  const look = t < 0.97 ? samplePath(path, i, Math.min(1, t + 0.05), lngScale) : samplePath(path, i, Math.max(0, t - 0.05), lngScale);
  const moved = distanceMeters(sampled.latitude, sampled.longitude, look.latitude, look.longitude);
  let course = Number.isFinite(from.course) ? from.course : (to.course || 0);
  if (moved > 0.25) {
    course = t < 0.97
      ? bearingBetweenCoords(sampled.latitude, sampled.longitude, look.latitude, look.longitude)
      : bearingBetweenCoords(look.latitude, look.longitude, sampled.latitude, sampled.longitude);
  }
  return {
    position: {
      ...from,
      latitude: sampled.latitude,
      longitude: sampled.longitude,
      course,
      speed: lerp(from.speed || 0, to.speed || 0, t),
      altitude: lerp(from.altitude || 0, to.altitude || 0, t),
      fixTime: new Date(time).toISOString(),
    },
    fromIndex: i,
    atEnd: false,
  };
};

const SEEK_STEP_MS = 10000;
const PLAYBACK_SPEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 16, 32, 64];

const ReplayVehicleLayer = ({
  positions,
  times,
  playing,
  playbackRate,
  seekNonce,
  seekIndex,
  seekTime,
  playbackTimeRef,
  onSegmentChange,
  onEnded,
  onMarkerClick,
}) => {
  const id = useId();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const iconScale = useAttributePreference('iconScale', desktop ? 0.75 : 1);
  const devices = useSelector((state) => state.devices.items);
  const smoothPath = useMemo(() => prepareSmoothTrack(positions), [positions]);

  const timeRef = useRef(times[0] || 0);
  const lastFrameRef = useRef(null);
  const rafRef = useRef(null);
  const segmentRef = useRef(0);
  const seekIndexRef = useRef(seekIndex);
  const positionsRef = useRef(positions);
  const timesRef = useRef(times);
  const pathRef = useRef(smoothPath);
  const rateRef = useRef(playbackRate);
  const onSegmentChangeRef = useRef(onSegmentChange);
  const onEndedRef = useRef(onEnded);
  const seekTimeRef = useRef(seekTime);
  const devicesRef = useRef(devices);
  const onMarkerClickRef = useRef(onMarkerClick);
  const displayRef = useRef({ latitude: null, longitude: null, course: null });
  const lastUiSyncRef = useRef(0);
  const geojsonRef = useRef({
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: {
        id: 0,
        deviceId: 0,
        category: 'default',
        color: 'neutral',
        title: '',
      },
    }],
  });

  seekIndexRef.current = seekIndex;
  positionsRef.current = positions;
  timesRef.current = times;
  pathRef.current = smoothPath;
  rateRef.current = playbackRate;
  onSegmentChangeRef.current = onSegmentChange;
  onEndedRef.current = onEnded;
  seekTimeRef.current = seekTime;
  devicesRef.current = devices;
  onMarkerClickRef.current = onMarkerClick;

  const writeMarker = useCallback((position, dt, snap) => {
    const source = map.getSource(id);
    if (!position) {
      source?.setData({ type: 'FeatureCollection', features: [] });
      displayRef.current = { latitude: null, longitude: null, course: null };
      return;
    }
    const device = devicesRef.current[position.deviceId];
    if (!device) {
      return;
    }
    let { latitude, longitude, course } = position;
    const prev = displayRef.current;
    const rate = rateRef.current || 1;
    if (!snap && prev.latitude != null && Number.isFinite(dt) && dt > 0) {
      const headingAlpha = 1 - Math.exp(-dt / HEADING_SMOOTH_MS);
      course = lerpAngle(prev.course ?? course, course || 0, headingAlpha);
      if (rate <= 8) {
        const posAlpha = 1 - Math.exp(-dt / Math.max(28, 80 / Math.sqrt(rate)));
        latitude = lerp(prev.latitude, latitude, posAlpha);
        longitude = lerp(prev.longitude, longitude, posAlpha);
      }
    }
    displayRef.current = { latitude, longitude, course: course || 0 };
    const collection = geojsonRef.current;
    const feature = collection.features[0];
    feature.geometry.coordinates[0] = longitude;
    feature.geometry.coordinates[1] = latitude;
    feature.properties.id = position.id;
    feature.properties.deviceId = position.deviceId;
    feature.properties.category = mapIconKey(device.category);
    feature.properties.color = 'neutral';
    feature.properties.title = formatTime(position.fixTime, 'seconds');
    source?.setData(collection);
  }, [id]);

  const syncIndex = useCallback((fromIndex, force) => {
    segmentRef.current = fromIndex;
    const now = performance.now();
    if (!force && now - lastUiSyncRef.current < UI_SYNC_MS) {
      return;
    }
    lastUiSyncRef.current = now;
    startTransition(() => {
      onSegmentChangeRef.current?.(fromIndex);
    });
  }, []);

  const applyTime = useCallback((time, notifySegment, snap, dt) => {
    const pts = positionsRef.current;
    const ts = timesRef.current;
    const path = pathRef.current;
    if (!pts.length) {
      writeMarker(null, dt, true);
      return true;
    }
    const { position, fromIndex, atEnd } = interpolatePosition(pts, ts, path, time);
    writeMarker(position, dt, snap);
    if (playbackTimeRef) {
      playbackTimeRef.current = time;
    }
    if (notifySegment && fromIndex !== segmentRef.current) {
      syncIndex(fromIndex, false);
    } else if (notifySegment) {
      segmentRef.current = fromIndex;
    }
    return atEnd;
  }, [playbackTimeRef, syncIndex, writeMarker]);

  useEffect(() => {
    map.addSource(id, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });
    map.addLayer({
      id,
      type: 'symbol',
      source: id,
      layout: {
        'icon-image': '{category}-{color}',
        'icon-size': iconScale,
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'text-field': '{title}',
        'text-allow-overlap': true,
        'text-ignore-placement': true,
        'text-anchor': 'bottom',
        'text-offset': [0, -2 * iconScale],
        'text-font': findFonts(map),
        'text-size': 12,
      },
      paint: {
        'text-halo-color': 'white',
        'text-halo-width': 2,
      },
    });
    const onMouseEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const onMouseLeave = () => {
      map.getCanvas().style.cursor = '';
    };
    const onClick = (event) => {
      event.preventDefault();
      const feature = event.features?.[0];
      if (feature && onMarkerClickRef.current) {
        onMarkerClickRef.current(feature.properties.id, feature.properties.deviceId);
      }
    };
    map.on('mouseenter', id, onMouseEnter);
    map.on('mouseleave', id, onMouseLeave);
    map.on('click', id, onClick);
    return () => {
      map.off('mouseenter', id, onMouseEnter);
      map.off('mouseleave', id, onMouseLeave);
      map.off('click', id, onClick);
      if (map.getLayer(id)) {
        map.removeLayer(id);
      }
      if (map.getSource(id)) {
        map.removeSource(id);
      }
    };
  }, [id]);

  useEffect(() => {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, 'icon-size', iconScale);
      map.setLayoutProperty(id, 'text-offset', [0, -2 * iconScale]);
    }
  }, [id, iconScale]);

  useEffect(() => {
    if (!times.length) {
      writeMarker(null, 0, true);
      return;
    }
    const i = Math.max(0, Math.min(seekIndexRef.current, times.length - 1));
    const explicit = seekTimeRef.current;
    timeRef.current = Number.isFinite(explicit)
      ? Math.max(times[0], Math.min(times[times.length - 1], explicit))
      : times[i];
    segmentRef.current = findSegmentIndex(times, timeRef.current);
    displayRef.current = { latitude: null, longitude: null, course: null };
    applyTime(timeRef.current, false, true, 0);
  }, [seekNonce, positions, times, applyTime, writeMarker]);

  const wasPlayingRef = useRef(false);

  useEffect(() => {
    if (!playing || times.length < 2) {
      lastFrameRef.current = null;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (wasPlayingRef.current) {
        syncIndex(segmentRef.current, true);
      }
      wasPlayingRef.current = false;
      return undefined;
    }

    wasPlayingRef.current = true;

    const tick = (now) => {
      if (lastFrameRef.current == null) {
        lastFrameRef.current = now;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const dt = Math.min(now - lastFrameRef.current, 48);
      lastFrameRef.current = now;
      const ts = timesRef.current;
      const endTime = ts[ts.length - 1];
      timeRef.current = Math.min(endTime, timeRef.current + dt * rateRef.current);
      const atEnd = applyTime(timeRef.current, true, false, dt);
      if (atEnd || timeRef.current >= endTime) {
        timeRef.current = endTime;
        applyTime(endTime, true, true, dt);
        syncIndex(Math.max(0, ts.length - 1), true);
        onEndedRef.current?.();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastFrameRef.current = null;
    };
  }, [playing, times.length, applyTime, syncIndex]);

  return null;
};

const ReplayPage = () => {
  const t = useTranslation();
  const { classes } = useStyles();
  const navigate = useNavigate();

  const speedUnit = useAttributePreference('speedUnit');
  const distanceUnit = useAttributePreference('distanceUnit');
  const coordinateFormat = usePreference('coordinateFormat');

  const [searchParams, setSearchParams] = useSearchParams();

  const defaultDeviceId = useSelector((state) => state.devices.selectedId);

  const [positions, setPositions] = useState([]);
  const [index, setIndex] = useState(0);
  const [selectedDeviceId, setSelectedDeviceId] = useState(defaultDeviceId);
  const [showCard, setShowCard] = useState(false);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seekNonce, setSeekNonce] = useState(0);
  const [seekTime, setSeekTime] = useState(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const playbackTimeRef = useRef(0);

  const loaded = Boolean(from && to && !loading && positions.length);

  const deviceName = useSelector((state) => {
    if (selectedDeviceId) {
      const device = state.devices.items[selectedDeviceId];
      if (device) {
        return device.name;
      }
    }
    return null;
  });

  useEffect(() => {
    if (!from && !to) {
      setPositions([]);
    }
  }, [from, to, setPositions]);

  const times = useMemo(
    () => positions.map((position) => new Date(position.fixTime).getTime()),
    [positions],
  );

  const sliderMarks = useMemo(() => {
    const n = positions.length;
    if (n <= 2) {
      return [];
    }
    const maxMarks = 48;
    const step = Math.max(1, Math.ceil((n - 1) / maxMarks));
    const marks = [];
    for (let i = 0; i < n; i += step) {
      marks.push({ value: i });
    }
    if (marks[marks.length - 1].value !== n - 1) {
      marks.push({ value: n - 1 });
    }
    return marks;
  }, [positions.length]);

  const seekToIndex = useCallback((nextIndex) => {
    const i = Math.max(0, Math.min(nextIndex, Math.max(times.length - 1, 0)));
    setIndex(i);
    setSeekTime(times[i] ?? null);
    setSeekNonce((nonce) => nonce + 1);
  }, [times]);

  const seekBySeconds = useCallback((deltaSeconds) => {
    if (!times.length) {
      return;
    }
    const start = times[0];
    const end = times[times.length - 1];
    const current = Number.isFinite(playbackTimeRef.current)
      ? playbackTimeRef.current
      : (times[Math.max(0, Math.min(index, times.length - 1))] ?? start);
    const next = Math.max(start, Math.min(end, current + deltaSeconds * 1000));
    const nextIndex = next >= end ? times.length - 1 : findSegmentIndex(times, next);
    setIndex(nextIndex);
    setSeekTime(next);
    setSeekNonce((nonce) => nonce + 1);
  }, [times, index]);

  const onPointClick = useCallback((_, nextIndex) => {
    seekToIndex(nextIndex);
  }, [seekToIndex]);

  const onMarkerClick = useCallback(
    (positionId) => {
      setShowCard(!!positionId);
    },
    [setShowCard],
  );

  const onShow = useCatch(async ({ deviceIds, from, to }) => {
    const deviceId = deviceIds.find(() => true);
    setLoading(true);
    setSelectedDeviceId(deviceId);
    const query = new URLSearchParams({ deviceId, from, to });
    try {
      const response = await fetchOrThrow(`/api/positions?${query.toString()}`);
      setPlaying(false);
      setIndex(0);
      setSeekTime(null);
      setSeekNonce((nonce) => nonce + 1);
      const positions = await response.json();
      setPositions(positions);
      if (!positions.length) {
        throw Error(t('sharedNoData'));
      }
    } finally {
      setLoading(false);
    }
  });

  const handleDownload = () => {
    const query = new URLSearchParams({ deviceId: selectedDeviceId, from, to });
    window.location.assign(`/api/positions/kml?${query.toString()}`);
  };

  const tripStats = useMemo(() => {
    if (!positions.length) return null;

    const speeds = positions.map((p) => p.speed || 0);
    const maxSpeed = Math.max(...speeds);
    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const movingSpeeds = speeds.filter((s) => s > 0);
    const avgMovingSpeed = movingSpeeds.length
      ? movingSpeeds.reduce((a, b) => a + b, 0) / movingSpeeds.length
      : 0;

    let totalDistance = 0;
    for (let i = 0; i < positions.length; i += 1) {
      totalDistance += positions[i].attributes?.distance || 0;
    }

    const firstTime = new Date(positions[0].fixTime);
    const lastTime = new Date(positions[positions.length - 1].fixTime);
    const durationMs = Math.max(0, lastTime - firstTime);
    const durationH = Math.floor(durationMs / 3600000);
    const durationM = Math.floor((durationMs % 3600000) / 60000);
    const durationS = Math.floor((durationMs % 60000) / 1000);

    const isParked = (p) => p?.attributes?.motion === false || p?.speed === 0;
    let stopCount = 0;
    let stopMs = 0;
    let i = 0;
    while (i < positions.length) {
      if (!isParked(positions[i])) { i += 1; continue; }
      const start = i;
      while (i < positions.length && isParked(positions[i])) i += 1;
      const end = i - 1;
      const sMs = Math.max(0, new Date(positions[end].fixTime) - new Date(positions[start].fixTime));
      if (sMs >= 60000) {
        stopCount += 1;
        stopMs += sMs;
      }
    }
    const stopH = Math.floor(stopMs / 3600000);
    const stopM = Math.floor((stopMs % 3600000) / 60000);

    return {
      maxSpeed, avgSpeed, avgMovingSpeed,
      totalDistance, durationMs,
      durationStr: `${String(durationH).padStart(2, '0')}:${String(durationM).padStart(2, '0')}:${String(durationS).padStart(2, '0')}`,
      stopCount,
      stopStr: stopH > 0 ? `${stopH}h ${stopM}m` : `${stopM}m`,
      firstTime, lastTime,
      totalPoints: positions.length,
    };
  }, [positions]);

  const currentPos = positions[index] || null;

  const speedPercent = useMemo(() => {
    if (!currentPos || !tripStats || !tripStats.maxSpeed) return 0;
    return Math.min(100, ((currentPos.speed || 0) / tripStats.maxSpeed) * 100);
  }, [currentPos, tripStats]);

  const StatCard = ({ icon, iconBg, value, label }) => (
    <Box className={classes.statCard}>
      <Box className={classes.statIconWrap} sx={{ background: `${iconBg}18` }}>
        <Box sx={{ color: iconBg, display: 'flex' }}>{icon}</Box>
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography className={classes.statValue} noWrap>{value}</Typography>
        <Typography className={classes.statLabel}>{label}</Typography>
      </Box>
    </Box>
  );

  return (
    <div className={classes.root}>
      <MapView>
        <MapOverlay />
        <MapGeofence />
        <MapRoutePath positions={positions} />
        <MapRoutePoints positions={positions} onClick={onPointClick} showSpeedControl />
        {positions.length > 0 && (
          <ReplayVehicleLayer
            positions={positions}
            times={times}
            playing={playing}
            playbackRate={playbackSpeed}
            seekNonce={seekNonce}
            seekIndex={index}
            seekTime={seekTime}
            playbackTimeRef={playbackTimeRef}
            onSegmentChange={setIndex}
            onEnded={() => {
              setPlaying(false);
              setIndex((current) => (positions.length ? positions.length - 1 : current));
            }}
            onMarkerClick={onMarkerClick}
          />
        )}
      </MapView>
      <MapScale />
      <MapCamera positions={positions} />
      <div className={classes.sidebar}>
        <Paper elevation={3} className={classes.header}>
          <Toolbar className={classes.headerToolbar}>
            <IconButton edge="start" sx={{ mr: 1, color: 'inherit' }} onClick={() => navigate(-1)}>
              <BackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1, fontSize: '1rem' }}>
              {t('reportReplay')}
            </Typography>
            {loaded && (
              <>
                <Tooltip title={t('reportExport')}>
                  <IconButton sx={{ color: 'inherit' }} onClick={handleDownload}>
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('reportFilter')}>
                  <IconButton
                    edge="end"
                    sx={{ color: 'inherit' }}
                    onClick={() => updateReportParams(searchParams, setSearchParams, 'ignore', [])}
                  >
                    <TuneIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Toolbar>
        </Paper>
        <Paper className={classes.content}>
          {loaded && (
            <>
              {/* Device name chip */}
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Box className={classes.deviceChip}>
                  <GpsFixedIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                  <Typography className={classes.deviceChipText}>{deviceName}</Typography>
                </Box>
              </Box>

              {/* Trip summary stats */}
              {tripStats && (
                <Box className={classes.statsGrid}>
                  <StatCard
                    icon={<SpeedIcon sx={{ fontSize: 16 }} />}
                    iconBg="#1565c0"
                    value={formatSpeed(tripStats.maxSpeed, speedUnit, t)}
                    label={`Max ${t('positionSpeed')}`}
                  />
                  <StatCard
                    icon={<SpeedIcon sx={{ fontSize: 16 }} />}
                    iconBg="#00897b"
                    value={formatSpeed(tripStats.avgMovingSpeed, speedUnit, t)}
                    label={`Avg ${t('positionSpeed')}`}
                  />
                  <StatCard
                    icon={<RouteIcon sx={{ fontSize: 16 }} />}
                    iconBg="#7b1fa2"
                    value={formatDistance(tripStats.totalDistance, distanceUnit, t)}
                    label={t('positionDistance')}
                  />
                  <StatCard
                    icon={<TimerIcon sx={{ fontSize: 16 }} />}
                    iconBg="#ed6c02"
                    value={tripStats.durationStr}
                    label={t('reportDuration')}
                  />
                  <StatCard
                    icon={<LocalParkingIcon sx={{ fontSize: 16 }} />}
                    iconBg="#d32f2f"
                    value={`${tripStats.stopCount} (${tripStats.stopStr})`}
                    label={t('reportStops')}
                  />
                  <StatCard
                    icon={<GpsFixedIcon sx={{ fontSize: 16 }} />}
                    iconBg="#455a64"
                    value={tripStats.totalPoints}
                    label={t('sharedType')}
                  />
                </Box>
              )}

              {/* Player */}
              <Box className={classes.playerSection}>
                <Slider
                  size="small"
                  max={positions.length - 1}
                  step={1}
                  marks={sliderMarks}
                  value={index}
                  onChange={(_, val) => seekToIndex(val)}
                  sx={{
                    '& .MuiSlider-track': {
                      background: 'linear-gradient(90deg, #1565c0, #42a5f5)',
                    },
                    '& .MuiSlider-thumb': {
                      width: 14,
                      height: 14,
                      boxShadow: '0 2px 6px rgba(21,101,192,0.3)',
                    },
                    '& .MuiSlider-mark': {
                      width: 2,
                      height: 2,
                      borderRadius: '50%',
                    },
                  }}
                />
                <Box className={classes.playerControls}>
                  <Tooltip title="Start">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => seekToIndex(0)}
                        disabled={playing || index <= 0}
                      >
                        <SkipPreviousIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={t('reportPrevious')}>
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => seekBySeconds(-10)}
                        disabled={playing || index <= 0}
                      >
                        <FastRewindIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <IconButton
                    className={classes.playButton}
                    onClick={() => setPlaying(!playing)}
                    disabled={index >= positions.length - 1}
                  >
                    {playing ? <PauseIcon /> : <PlayArrowIcon />}
                  </IconButton>
                  <Tooltip title={t('reportNext')}>
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => seekBySeconds(10)}
                        disabled={playing || index >= positions.length - 1}
                      >
                        <FastForwardIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="End">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => seekToIndex(positions.length - 1)}
                        disabled={playing || index >= positions.length - 1}
                      >
                        <SkipNextIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
                <Box className={classes.speedRow}>
                  <SpeedIcon sx={{ fontSize: 14, color: 'text.secondary', mr: 0.25 }} />
                  {PLAYBACK_SPEEDS.map((speed) => (
                    <Button
                      key={speed}
                      size="small"
                      className={`${classes.speedButton} ${playbackSpeed === speed ? classes.speedButtonActive : ''}`}
                      onClick={() => setPlaybackSpeed(speed)}
                      aria-pressed={playbackSpeed === speed}
                    >
                      {`${speed}x`}
                    </Button>
                  ))}
                </Box>
                <Box className={classes.timeRow}>
                  <Typography className={classes.timeText}>
                    {currentPos ? formatTime(currentPos.fixTime, 'seconds') : '--'}
                  </Typography>
                  <Typography className={classes.posCounter}>
                    {index + 1} / {positions.length}
                  </Typography>
                  <Typography className={classes.timeText}>
                    {positions.length ? formatTime(positions[positions.length - 1].fixTime, 'seconds') : '--'}
                  </Typography>
                </Box>
              </Box>

              {/* Live position details */}
              {currentPos && (
                <Box className={classes.liveCard}>
                  <Typography className={classes.liveTitle}>
                    <AccessTimeIcon sx={{ fontSize: 14 }} />
                    {formatTime(currentPos.fixTime, 'seconds')}
                  </Typography>

                  <Box className={classes.liveRow}>
                    <Typography className={classes.liveLabel}>
                      <SpeedIcon sx={{ fontSize: 12 }} /> {t('positionSpeed')}
                    </Typography>
                    <Typography className={classes.liveValue}>
                      {formatSpeed(currentPos.speed, speedUnit, t)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={speedPercent}
                    className={classes.speedBar}
                    sx={{
                      bgcolor: 'rgba(0,0,0,0.06)',
                      mb: 0.5,
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 3,
                        background: speedPercent > 80
                          ? 'linear-gradient(90deg, #ed6c02, #d32f2f)'
                          : 'linear-gradient(90deg, #1565c0, #42a5f5)',
                      },
                    }}
                  />

                  <Box className={classes.liveRow}>
                    <Typography className={classes.liveLabel}>
                      <ExploreIcon sx={{ fontSize: 12 }} /> {t('positionCourse')}
                    </Typography>
                    <Typography className={classes.liveValue}>
                      {currentPos.course ? `${currentPos.course.toFixed(0)}°` : '—'}
                    </Typography>
                  </Box>

                  {currentPos.altitude !== undefined && (
                    <Box className={classes.liveRow}>
                      <Typography className={classes.liveLabel}>
                        <HeightIcon sx={{ fontSize: 12 }} /> {t('positionAltitude')}
                      </Typography>
                      <Typography className={classes.liveValue}>
                        {`${currentPos.altitude.toFixed(0)} m`}
                      </Typography>
                    </Box>
                  )}

                  <Box className={classes.liveRow}>
                    <Typography className={classes.liveLabel}>
                      <GpsFixedIcon sx={{ fontSize: 12 }} /> {t('positionAddress')}
                    </Typography>
                    <Typography className={classes.liveValue} sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.65rem' }}>
                      {formatAddress(currentPos, coordinateFormat)}
                    </Typography>
                  </Box>

                  {currentPos.attributes?.motion !== undefined && (
                    <Box className={classes.liveRow}>
                      <Typography className={classes.liveLabel}>
                        {currentPos.attributes.motion
                          ? <SpeedIcon sx={{ fontSize: 12, color: 'success.main' }} />
                          : <LocalParkingIcon sx={{ fontSize: 12, color: 'warning.main' }} />}
                        {' '}{t('positionMotion')}
                      </Typography>
                      <Typography
                        className={classes.liveValue}
                        sx={{ color: currentPos.attributes.motion ? 'success.main' : 'warning.main' }}
                      >
                        {currentPos.attributes.motion ? t('positionMotion') : t('reportStops')}
                      </Typography>
                    </Box>
                  )}

                  {currentPos.attributes?.batteryLevel !== undefined && (
                    <Box className={classes.liveRow}>
                      <Typography className={classes.liveLabel}>
                        {t('positionBatteryLevel')}
                      </Typography>
                      <Typography className={classes.liveValue}>
                        {`${currentPos.attributes.batteryLevel}%`}
                      </Typography>
                    </Box>
                  )}

                  {currentPos.attributes?.ignition !== undefined && (
                    <Box className={classes.liveRow}>
                      <Typography className={classes.liveLabel}>
                        {t('positionIgnition')}
                      </Typography>
                      <Typography
                        className={classes.liveValue}
                        sx={{ color: currentPos.attributes.ignition ? 'success.main' : 'text.secondary' }}
                      >
                        {currentPos.attributes.ignition ? 'ON' : 'OFF'}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </>
          )}
          <div style={{ display: loaded ? 'none' : 'block' }}>
            <ReportFilter onShow={onShow} deviceType="single" loading={loading} />
          </div>
        </Paper>
      </div>
      {showCard && index < positions.length && (
        <StatusCard
          deviceId={selectedDeviceId}
          position={positions[index]}
          onClose={() => setShowCard(false)}
          disableActions
        />
      )}
    </div>
  );
};

export default ReplayPage;
