import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Box,
  IconButton,
  Paper,
  Slider,
  Toolbar,
  Tooltip,
  Typography,
  LinearProgress,
} from '@mui/material';
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
import MapView from '../map/core/MapView';
import MapRoutePath from '../map/MapRoutePath';
import MapRoutePoints from '../map/MapRoutePoints';
import MapPositions from '../map/MapPositions';
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

const ReplayPage = () => {
  const t = useTranslation();
  const { classes } = useStyles();
  const navigate = useNavigate();
  const timerRef = useRef();

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

  useEffect(() => {
    if (playing && positions.length > 0) {
      timerRef.current = setInterval(() => {
        setIndex((index) => index + 1);
      }, 500);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [playing, positions]);

  useEffect(() => {
    if (index >= positions.length - 1) {
      clearInterval(timerRef.current);
      setPlaying(false);
    }
  }, [index, positions]);

  const onPointClick = useCallback(
    (_, index) => {
      setIndex(index);
    },
    [setIndex],
  );

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
      setIndex(0);
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
        {index < positions.length && (
          <MapPositions
            positions={[positions[index]]}
            onMarkerClick={onMarkerClick}
            titleField="fixTime"
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
                  step={null}
                  marks={positions.map((_, i) => ({ value: i }))}
                  value={index}
                  onChange={(_, val) => setIndex(val)}
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
                        onClick={() => setIndex(0)}
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
                        onClick={() => setIndex((i) => i - 1)}
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
                        onClick={() => setIndex((i) => i + 1)}
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
                        onClick={() => setIndex(positions.length - 1)}
                        disabled={playing || index >= positions.length - 1}
                      >
                        <SkipNextIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
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
