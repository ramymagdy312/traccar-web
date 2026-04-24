import {
  useEffect, useMemo, useRef, useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTheme } from '@mui/material/styles';
import { IconButton, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import maplibregl from 'maplibre-gl';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import LocationSearchingIcon from '@mui/icons-material/LocationSearching';
import RouteIcon from '@mui/icons-material/Route';
import {
  formatAddress,
  formatDistance,
  formatSpeed,
  formatVolume,
  formatTime,
  formatNumericHours,
} from '../common/util/formatter';
import ReportFilter from './components/ReportFilter';
import { useAttributePreference, usePreference } from '../common/util/preferences';
import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';
import ColumnSelect from './components/ColumnSelect';
import usePersistedState from '../common/util/usePersistedState';
import { useCatch, useEffectAsync } from '../reactHelper';
import useReportStyles from './common/useReportStyles';
import MapView from '../map/core/MapView';
import MapRoutePath from '../map/MapRoutePath';
import AddressValue from '../common/components/AddressValue';
import TableShimmer from '../common/components/TableShimmer';
import MapMarkers from '../map/MapMarkers';
import MapCamera from '../map/MapCamera';
import MapGeofence from '../map/MapGeofence';
import MapPositions from '../map/MapPositions';
import scheduleReport from './common/scheduleReport';
import MapScale from '../map/MapScale';
import fetchOrThrow from '../common/util/fetchOrThrow';
import exportExcel from '../common/util/exportExcel';
import { deviceEquality } from '../common/util/deviceEquality';
import { map } from '../map/core/MapView';

const columnsArray = [
  ['startTime', 'reportStartTime'],
  ['startOdometer', 'reportStartOdometer'],
  ['startAddress', 'reportStartAddress'],
  ['endTime', 'reportEndTime'],
  ['endOdometer', 'reportEndOdometer'],
  ['endAddress', 'reportEndAddress'],
  ['distance', 'sharedDistance'],
  ['averageSpeed', 'reportAverageSpeed'],
  ['maxSpeed', 'reportMaximumSpeed'],
  ['duration', 'reportDuration'],
  ['spentFuel', 'reportSpentFuel'],
  ['driverName', 'sharedDriver'],
];
const columnsMap = new Map(columnsArray);
const playbackIntervalMs = 120;
const minPlaybackDurationMs = 4000;
const maxPlaybackDurationMs = 15000;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const parseTime = (value) => {
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : null;
};

const computeBearing = (from, to) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const deltaLon = toRad(to.longitude - from.longitude);
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2)
    - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
};

const segmentLength = (from, to) => {
  const dx = to.longitude - from.longitude;
  const dy = to.latitude - from.latitude;
  return Math.sqrt((dx ** 2) + (dy ** 2));
};

const interpolatePosition = (positions, progress, selectedItem) => {
  if (!positions.length) return null;
  if (positions.length === 1) return positions[0];

  const lengths = [];
  let totalLength = 0;
  for (let i = 0; i < positions.length - 1; i += 1) {
    const length = segmentLength(positions[i], positions[i + 1]);
    lengths.push(length);
    totalLength += length;
  }

  const targetLength = totalLength > 0 ? totalLength * progress : progress * (positions.length - 1);
  let accumulated = 0;
  let segmentIndex = 0;
  for (; segmentIndex < lengths.length; segmentIndex += 1) {
    const length = totalLength > 0 ? lengths[segmentIndex] : 1;
    if (accumulated + length >= targetLength || segmentIndex === lengths.length - 1) {
      break;
    }
    accumulated += length;
  }

  const from = positions[segmentIndex];
  const to = positions[Math.min(segmentIndex + 1, positions.length - 1)];
  const currentLength = totalLength > 0 ? lengths[segmentIndex] : 1;
  const ratio = currentLength > 0 ? (targetLength - accumulated) / currentLength : 0;
  const fromTime = parseTime(from.fixTime) ?? parseTime(selectedItem?.startTime);
  const toTime = parseTime(to.fixTime) ?? parseTime(selectedItem?.endTime);
  const currentTime = fromTime != null && toTime != null
    ? new Date(fromTime + ((toTime - fromTime) * ratio)).toISOString()
    : selectedItem?.startTime;
  const course = Number.isFinite(from.course) && from.course > 0
    ? from.course
    : computeBearing(from, to);
  const speed = Number.isFinite(from.speed) && Number.isFinite(to.speed)
    ? from.speed + ((to.speed - from.speed) * ratio)
    : selectedItem?.averageSpeed || 0;

  return {
    ...from,
    id: `${selectedItem?.startPositionId || 'trip'}-${Math.round(progress * 1000)}`,
    latitude: from.latitude + ((to.latitude - from.latitude) * ratio),
    longitude: from.longitude + ((to.longitude - from.longitude) * ratio),
    course,
    speed,
    fixTime: currentTime,
  };
};

const TripReportPage = () => {
  const navigate = useNavigate();
  const { classes } = useReportStyles();
  const t = useTranslation();
  const theme = useTheme();

  const devices = useSelector((state) => state.devices.items, deviceEquality(['id', 'name']));

  const distanceUnit = useAttributePreference('distanceUnit');
  const speedUnit = useAttributePreference('speedUnit');
  const volumeUnit = useAttributePreference('volumeUnit');
  const coordinateFormat = usePreference('coordinateFormat');

  const [columns, setColumns] = usePersistedState('tripColumns', [
    'startTime',
    'endTime',
    'distance',
    'averageSpeed',
  ]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [route, setRoute] = useState(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef();
  const popupRef = useRef();

  const createMarkers = () => [
    {
      latitude: selectedItem.startLat,
      longitude: selectedItem.startLon,
      image: 'start-success',
    },
    {
      latitude: selectedItem.endLat,
      longitude: selectedItem.endLon,
      image: 'finish-error',
    },
  ];

  useEffectAsync(async () => {
    if (selectedItem) {
      const query = new URLSearchParams({
        deviceId: selectedItem.deviceId,
        from: selectedItem.startTime,
        to: selectedItem.endTime,
      });
      const response = await fetchOrThrow(`/api/reports/route?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      setRoute(await response.json());
    } else {
      setRoute(null);
    }
  }, [selectedItem]);

  useEffect(() => {
    setPlaybackProgress(0);
    setPlaying(Boolean(selectedItem));
    return () => clearInterval(timerRef.current);
  }, [selectedItem]);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (!playing || !selectedItem) {
      return undefined;
    }
    const playbackDurationMs = clamp(
      (selectedItem.duration || 0) * 1000,
      minPlaybackDurationMs,
      maxPlaybackDurationMs,
    );
    const progressStep = playbackIntervalMs / playbackDurationMs;
    timerRef.current = setInterval(() => {
      setPlaybackProgress((value) => {
        const next = value + progressStep;
        if (next >= 1) {
          clearInterval(timerRef.current);
          setPlaying(false);
          return 1;
        }
        return next;
      });
    }, playbackIntervalMs);
    return () => clearInterval(timerRef.current);
  }, [playing, selectedItem]);

  const focusPositions = useMemo(() => (selectedItem ? [
    {
      deviceId: selectedItem.deviceId,
      id: selectedItem.startPositionId || `${selectedItem.deviceId}-start`,
      fixTime: selectedItem.startTime,
      latitude: selectedItem.startLat,
      longitude: selectedItem.startLon,
      speed: selectedItem.averageSpeed || 0,
      course: 0,
    },
    {
      deviceId: selectedItem.deviceId,
      id: selectedItem.endPositionId || `${selectedItem.deviceId}-end`,
      fixTime: selectedItem.endTime,
      latitude: selectedItem.endLat,
      longitude: selectedItem.endLon,
      speed: selectedItem.maxSpeed || selectedItem.averageSpeed || 0,
      course: 0,
    },
  ] : []), [selectedItem]);

  const routePositions = useMemo(() => (route?.length ? route : focusPositions), [route, focusPositions]);

  const currentPosition = useMemo(
    () => (selectedItem ? interpolatePosition(routePositions, playbackProgress, selectedItem) : null),
    [routePositions, playbackProgress, selectedItem],
  );

  useEffect(() => {
    if (!selectedItem || !currentPosition || !map) {
      popupRef.current?.remove();
      popupRef.current = null;
      return undefined;
    }

    if (!popupRef.current) {
      popupRef.current = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        maxWidth: '320px',
      });
    }

    const popupHtml = `
      <div style="font-family: Inter, Roboto, Arial, sans-serif; font-size: 12px; line-height: 1.45; min-width: 240px;">
        <div style="font-weight: 700; margin-bottom: 8px;">${devices[selectedItem.deviceId]?.name || t('sharedDevice')}</div>
        <div style="display: flex; justify-content: space-between; padding: 2px 0;">
          <span>${t('positionSpeed')}</span>
          <b>${formatSpeed(currentPosition.speed || 0, speedUnit, t)}</b>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 2px 0;">
          <span>${t('reportAverageSpeed')}</span>
          <b>${formatSpeed(selectedItem.averageSpeed || 0, speedUnit, t)}</b>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 2px 0;">
          <span>${t('reportMaximumSpeed')}</span>
          <b>${formatSpeed(selectedItem.maxSpeed || 0, speedUnit, t)}</b>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 2px 0;">
          <span>${t('sharedDistance')}</span>
          <b>${formatDistance(selectedItem.distance || 0, distanceUnit, t)}</b>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 2px 0;">
          <span>${t('reportDuration')}</span>
          <b>${formatNumericHours(selectedItem.duration, t)}</b>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 2px 0;">
          <span>${t('reportStartTime')}</span>
          <b>${formatTime(selectedItem.startTime, 'seconds')}</b>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 2px 0;">
          <span>${t('reportEndTime')}</span>
          <b>${formatTime(selectedItem.endTime, 'seconds')}</b>
        </div>
        ${selectedItem.driverName ? `
        <div style="display: flex; justify-content: space-between; padding: 2px 0;">
          <span>${t('sharedDriver')}</span>
          <b>${selectedItem.driverName}</b>
        </div>
        ` : ''}
        <button
          type="button"
          data-action="play-movement"
          style="margin-top: 10px; width: 100%; border: 0; border-radius: 4px; padding: 7px 8px; cursor: pointer; background: #1976d2; color: white; font-weight: 600;"
        >
          ${t('reportReplay')}
        </button>
      </div>
    `;

    popupRef.current
      .setLngLat([currentPosition.longitude, currentPosition.latitude])
      .setHTML(popupHtml)
      .addTo(map);

    const playButton = popupRef.current.getElement()?.querySelector('[data-action="play-movement"]');
    const onPlayClick = () => {
      setPlaybackProgress(0);
      setPlaying(true);
    };
    playButton?.addEventListener('click', onPlayClick);
    return () => playButton?.removeEventListener('click', onPlayClick);
  }, [selectedItem, currentPosition, devices, speedUnit, distanceUnit, t]);

  const onShow = useCatch(async ({ deviceIds, groupIds, from, to }) => {
    const query = new URLSearchParams({ from, to });
    deviceIds.forEach((deviceId) => query.append('deviceId', deviceId));
    groupIds.forEach((groupId) => query.append('groupId', groupId));
    setLoading(true);
    try {
      const response = await fetchOrThrow(`/api/reports/trips?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      setItems(await response.json());
    } finally {
      setLoading(false);
    }
  });

  const onExport = useCatch(async () => {
    const sheets = new Map();
    items.forEach((item) => {
      const deviceName = devices[item.deviceId].name;
      if (!sheets.has(deviceName)) {
        sheets.set(deviceName, []);
      }
      const row = {};
      columns.forEach((key) => {
        const header = t(columnsMap.get(key));
        if (key === 'startAddress') {
          row[header] = formatAddress(
            {
              address: item.startAddress,
              latitude: item.startLat,
              longitude: item.startLon,
            },
            coordinateFormat,
          );
        } else if (key === 'endAddress') {
          row[header] = formatAddress(
            {
              address: item.endAddress,
              latitude: item.endLat,
              longitude: item.endLon,
            },
            coordinateFormat,
          );
        } else {
          row[header] = formatValue(item, key);
        }
      });
      sheets.get(deviceName).push(row);
    });
    await exportExcel(t('reportTrips'), 'trips.xlsx', sheets, theme);
  });

  const onSchedule = useCatch(async (deviceIds, groupIds, report) => {
    report.type = 'trips';
    await scheduleReport(deviceIds, groupIds, report);
    navigate('/reports/scheduled');
  });

  const navigateToReplay = (item) => {
    navigate({
      pathname: '/replay',
      search: new URLSearchParams({
        from: item.startTime,
        to: item.endTime,
        deviceId: item.deviceId,
      }).toString(),
    });
  };

  const formatValue = (item, key) => {
    const value = item[key];
    switch (key) {
      case 'deviceId':
        return devices[value].name;
      case 'startTime':
      case 'endTime':
        return formatTime(value, 'minutes');
      case 'startOdometer':
      case 'endOdometer':
      case 'distance':
        return formatDistance(value, distanceUnit, t);
      case 'averageSpeed':
      case 'maxSpeed':
        return value > 0 ? formatSpeed(value, speedUnit, t) : null;
      case 'duration':
        return formatNumericHours(value, t);
      case 'spentFuel':
        return value > 0 ? formatVolume(value, volumeUnit, t) : null;
      case 'startAddress':
        return (
          <AddressValue
            latitude={item.startLat}
            longitude={item.startLon}
            originalAddress={value}
          />
        );
      case 'endAddress':
        return (
          <AddressValue latitude={item.endLat} longitude={item.endLon} originalAddress={value} />
        );
      default:
        return value;
    }
  };

  return (
    <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'reportTrips']}>
      <div className={classes.container}>
        {selectedItem && (
          <div className={classes.containerMap}>
            <MapView>
              <MapGeofence />
              {selectedItem && (
                <>
                  {routePositions.length > 1 && <MapRoutePath positions={routePositions} />}
                  <MapMarkers markers={createMarkers()} />
                  {currentPosition && (
                    <MapPositions
                      positions={[currentPosition]}
                      selectedPosition={currentPosition}
                      titleField="fixTime"
                    />
                  )}
                  <MapCamera positions={routePositions} />
                </>
              )}
            </MapView>
            <MapScale />
          </div>
        )}
        <div className={classes.containerMain}>
          <div className={classes.header}>
            <ReportFilter
              onShow={onShow}
              onExport={onExport}
              onSchedule={onSchedule}
              deviceType="multiple"
              loading={loading}
            >
              <ColumnSelect columns={columns} setColumns={setColumns} columnsArray={columnsArray} />
            </ReportFilter>
          </div>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell className={classes.columnAction} />
                <TableCell>{t('sharedDevice')}</TableCell>
                {columns.map((key) => (
                  <TableCell key={key}>{t(columnsMap.get(key))}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading ? (
                items.map((item) => (
                  <TableRow key={item.startPositionId}>
                    <TableCell className={classes.columnAction} padding="none">
                      <div className={classes.columnActionContainer}>
                        {selectedItem === item ? (
                          <IconButton size="small" onClick={() => setSelectedItem(null)}>
                            <GpsFixedIcon fontSize="small" />
                          </IconButton>
                        ) : (
                          <IconButton size="small" onClick={() => setSelectedItem(item)}>
                            <LocationSearchingIcon fontSize="small" />
                          </IconButton>
                        )}
                        <IconButton size="small" onClick={() => navigateToReplay(item)}>
                          <RouteIcon fontSize="small" />
                        </IconButton>
                      </div>
                    </TableCell>
                    <TableCell>{devices[item.deviceId].name}</TableCell>
                    {columns.map((key) => (
                      <TableCell key={key}>{formatValue(item, key)}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableShimmer columns={columns.length + 2} startAction />
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </PageLayout>
  );
};

export default TripReportPage;
