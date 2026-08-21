import { useState, useId } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Rnd } from 'react-rnd';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CardActions,
  IconButton,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Menu,
  MenuItem,
  CardMedia,
  TableFooter,
  Link,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import CloseIcon from '@mui/icons-material/Close';
import RouteIcon from '@mui/icons-material/Route';
import SendIcon from '@mui/icons-material/Send';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PendingIcon from '@mui/icons-material/Pending';
import NavigationIcon from '@mui/icons-material/Navigation';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import ScheduleIcon from '@mui/icons-material/Schedule';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import PlaceIcon from '@mui/icons-material/Place';
import AppsIcon from '@mui/icons-material/Apps';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import DirectionsIcon from '@mui/icons-material/Directions';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import { useTranslation } from './LocalizationProvider';
import RemoveDialog from './RemoveDialog';
import PositionValue from './PositionValue';
import { useDeviceReadonly, useRestriction } from '../util/permissions';
import usePositionAttributes from '../attributes/usePositionAttributes';
import { devicesActions } from '../../store';
import { useCatch, useCatchCallback } from '../../reactHelper';
import { useAttributePreference } from '../util/preferences';
import { speedFromKnots, distanceFromMeters, speedUnitString, distanceUnitString } from '../util/converter';
import { formatSpeed, formatStatus, formatBoolean, formatDistance, formatPercentage } from '../util/formatter';
import fetchOrThrow from '../util/fetchOrThrow';

dayjs.extend(relativeTime);

const useStyles = makeStyles()((theme, { desktopPadding }) => ({
  card: {
    pointerEvents: 'auto',
    width: theme.dimensions.popupMaxWidth,
    borderRadius: '20px',
    overflow: 'hidden',
    background: 'linear-gradient(180deg, #0d1b2e 0%, #0a1628 40%, #080e18 100%)',
    color: '#e3f2fd',
    border: '1px solid rgba(64, 196, 255, 0.22)',
    boxShadow: '0 12px 48px rgba(25, 118, 210, 0.38), 0 0 0 1px rgba(0, 229, 255, 0.08), inset 0 1px 0 rgba(255,255,255,0.06)',
  },
  media: {
    height: theme.dimensions.popupImageHeight,
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  mediaButton: {
    color: theme.palette.common.white,
    mixBlendMode: 'difference',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1.25, 1.5, 1.25, 2),
    background: 'linear-gradient(180deg, #0f2744 0%, #0a1628 100%)',
    borderBottom: '1px solid rgba(0, 229, 255, 0.12)',
    '& .MuiTypography-root': {
      color: '#e3f2fd',
      fontWeight: 700,
    },
  },
  content: {
    paddingTop: theme.spacing(0.5),
    paddingBottom: theme.spacing(1),
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
    maxHeight: theme.dimensions.cardContentMaxHeight,
    overflow: 'auto',
    background: 'transparent',
  },
  icon: {
    width: '25px',
    height: '25px',
    filter: 'brightness(0) invert(1)',
  },
  table: {
    '& .MuiTableCell-sizeSmall': {
      paddingLeft: 0,
      paddingRight: 0,
    },
    '& .MuiTableCell-sizeSmall:first-of-type': {
      paddingRight: theme.spacing(1),
    },
  },
  cell: {
    borderBottom: 'none',
  },
  actions: {
    justifyContent: 'space-between',
    background: 'linear-gradient(180deg, rgba(8,14,24,0.95) 0%, #060a10 100%)',
    borderTop: '1px solid rgba(64, 196, 255, 0.12)',
    padding: theme.spacing(0.5, 1),
    '& .MuiIconButton-root': {
      color: '#64b5f6',
      '&:hover': { color: '#90caf9', backgroundColor: 'rgba(100,181,246,0.08)' },
    },
    '& .MuiIconButton-colorError': {
      color: '#ef5350',
      '&:hover': { color: '#ff7961', backgroundColor: 'rgba(239,83,80,0.08)' },
    },
  },
  neonTable: {
    '& .MuiTableCell-root': {
      color: 'rgba(227, 242, 253, 0.92)',
      borderColor: 'rgba(100, 180, 255, 0.1)',
    },
    '& .MuiLink-root': {
      color: '#4fc3f7',
    },
  },
  digitNeon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 14,
    height: 24,
    padding: theme.spacing(0, 0.3),
    borderRadius: 4,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: '0.82rem',
    fontWeight: 800,
    letterSpacing: 1,
    border: '1px solid rgba(57, 255, 100, 0.35)',
    background: '#030508',
    color: '#5cff8a',
    textShadow: '0 0 10px rgba(92, 255, 138, 0.55)',
    boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.85), 0 0 8px rgba(57, 255, 100, 0.15)',
  },
  root: {
    pointerEvents: 'none',
    position: 'fixed',
    zIndex: 5,
    left: '50%',
    [theme.breakpoints.up('md')]: {
      left: `calc(50% + ${desktopPadding} / 2)`,
      bottom: theme.spacing(3),
    },
    [theme.breakpoints.down('md')]: {
      left: '50%',
      bottom: `calc(${theme.spacing(3)} + ${theme.dimensions.bottomBarHeight}px)`,
    },
    transform: 'translateX(-50%)',
  },
}));

const GAUGE_MAX_KMH = 200;

/** 270° sweep: 0 km/h at ~225°, 200 km/h at ~315° (−45°), passing over the top (classic car dial). */
const GAUGE_SWEEP_RAD = (3 * Math.PI) / 2;
const GAUGE_START_RAD = (5 * Math.PI) / 4;

const polarToXY = (cx, cy, r, angleRad) => ({
  x: cx + r * Math.cos(angleRad),
  y: cy - r * Math.sin(angleRad),
});

/** Arc along the circle from angleFrom → angleTo (clockwise on the dial = decreasing math angle). */
const arcPathClockwise = (cx, cy, r, angleFrom, angleTo) => {
  const p1 = polarToXY(cx, cy, r, angleFrom);
  const p2 = polarToXY(cx, cy, r, angleTo);
  const delta = angleFrom - angleTo;
  const largeArc = Math.abs(delta) > Math.PI ? 1 : 0;
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} 1 ${p2.x} ${p2.y}`;
};

const speedKmhToAngle = (kmh) => {
  const ratio = Math.min(Math.max(kmh / GAUGE_MAX_KMH, 0), 1);
  return GAUGE_START_RAD - ratio * GAUGE_SWEEP_RAD;
};

const GAUGE_TICKS_KMH = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200];

const courseToCompass = (course) => {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(((course || 0) % 360) / 45) % 8;
  return dirs[idx];
};

const pillBaseSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.65,
  px: 1.2,
  py: 0.55,
  borderRadius: 999,
  fontSize: '0.62rem',
  fontWeight: 800,
  letterSpacing: 0.4,
  border: '1px solid',
  whiteSpace: 'nowrap',
};

const NeonSpeedometer = ({ speedKnots, speedUnit, t }) => {
  const filterId = useId().replace(/:/g, '');
  const speedKmh = speedFromKnots(speedKnots || 0, 'kmh');
  const needleAngle = speedKmhToAngle(speedKmh);
  const cx = 120;
  const cy = 118;
  const R = 88;
  const needleLen = 68;
  const nx = cx + needleLen * Math.cos(needleAngle);
  const ny = cy - needleLen * Math.sin(needleAngle);

  const a0 = speedKmhToAngle(0);
  const a60 = speedKmhToAngle(60);
  const a140 = speedKmhToAngle(140);
  const a200 = speedKmhToAngle(200);

  const tickStroke = 'rgba(180, 220, 255, 0.5)';
  const rimStroke = 'rgba(100, 180, 255, 0.22)';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto', mt: -1.5 }}>
      <svg viewBox="0 0 240 210" width="100%" style={{ maxWidth: 260, display: 'block', filter: 'drop-shadow(0 4px 14px rgba(0, 100, 200, 0.3))' }}>
        <defs>
          <filter id={`hubGlow-${filterId}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx={cx} cy={cy} r={R + 10} fill="none" stroke={rimStroke} strokeWidth="2" />
        <circle cx={cx} cy={cy} r={R + 4} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="6" />
        <path
          d={arcPathClockwise(cx, cy, R, a0, a60)}
          fill="none"
          stroke="#2e7d32"
          strokeWidth="11"
          strokeLinecap="round"
          opacity={0.95}
        />
        <path
          d={arcPathClockwise(cx, cy, R, a60, a140)}
          fill="none"
          stroke="#f9a825"
          strokeWidth="11"
          strokeLinecap="round"
          opacity={0.95}
        />
        <path
          d={arcPathClockwise(cx, cy, R, a140, a200)}
          fill="none"
          stroke="#c62828"
          strokeWidth="11"
          strokeLinecap="round"
          opacity={0.95}
        />
        <path
          d={arcPathClockwise(cx, cy, R - 12, a0, a200)}
          fill="none"
          stroke="rgba(0,0,0,0.4)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {GAUGE_TICKS_KMH.map((v) => {
          const ta = speedKmhToAngle(v);
          const x1 = cx + (R - 2) * Math.cos(ta);
          const y1 = cy - (R - 2) * Math.sin(ta);
          const x2 = cx + (R - 13) * Math.cos(ta);
          const y2 = cy - (R - 13) * Math.sin(ta);
          return <line key={v} x1={x1} y1={y1} x2={x2} y2={y2} stroke={tickStroke} strokeWidth="2" />;
        })}
        {GAUGE_TICKS_KMH.map((v) => {
          const ta = speedKmhToAngle(v);
          const tx = cx + (R - 26) * Math.cos(ta);
          const ty = cy - (R - 26) * Math.sin(ta);
          return (
            <text
              key={`l-${v}`}
              x={tx}
              y={ty}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(200, 230, 255, 0.88)"
              fontSize={v >= 100 ? '10' : '11'}
              fontWeight="800"
              style={{ fontFamily: 'system-ui, sans-serif' }}
            >
              {v}
            </text>
          );
        })}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#ff1744" strokeWidth="3.5" strokeLinecap="round" filter={`url(#hubGlow-${filterId})`} />
        <circle cx={cx} cy={cy} r="10" fill="#0a1628" stroke="rgba(100,200,255,0.55)" strokeWidth="2" filter={`url(#hubGlow-${filterId})`} />
        <circle cx={cx} cy={cy} r="4" fill="#ff1744" style={{ filter: 'drop-shadow(0 0 6px rgba(255,23,68,0.9))' }} />
      </svg>
      <Box
        sx={{
          mt: -0.5,
          px: 2,
          py: 0.5,
          borderRadius: 999,
          border: '1px solid rgba(0, 229, 255, 0.55)',
          background: 'linear-gradient(180deg, rgba(0,60,90,0.5) 0%, rgba(0,30,50,0.85) 100%)',
          boxShadow: '0 0 16px rgba(0, 229, 255, 0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
        }}
      >
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: '1rem',
            letterSpacing: 1,
            fontFamily: 'ui-monospace, monospace',
            color: '#80deea',
            textShadow: '0 0 12px rgba(128, 222, 234, 0.75)',
          }}
        >
          {formatSpeed(speedKnots || 0, speedUnit, t)}
        </Typography>
      </Box>
      <Typography sx={{ fontSize: '0.58rem', fontWeight: 700, color: 'rgba(180,220,255,0.55)', mt: 0.35, textTransform: 'uppercase', letterSpacing: 1.2 }}>
        {speedUnitString(speedUnit, t)}
      </Typography>
    </Box>
  );
};

const NeonOdometer = ({ meters, distanceUnit, t, classes }) => {
  const val = distanceFromMeters(meters, distanceUnit);
  const fixed = val.toFixed(2);
  const [intPart, frac] = fixed.split('.');
  const intDigits = intPart.padStart(6, '0').split('');
  const fracDigits = frac.split('');
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flex: '1 1 auto',
        minWidth: 0,
        px: 1,
        py: 1,
        borderRadius: 2,
        bgcolor: 'rgba(0,0,0,0.45)',
        border: '1px solid rgba(57, 255, 100, 0.2)',
        boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.6)',
      }}
    >
      <Typography sx={{ fontSize: '0.58rem', fontWeight: 800, mb: 0.75, textTransform: 'uppercase', letterSpacing: 1.4, color: 'rgba(180,220,255,0.55)' }}>
        {t('deviceTotalDistance')}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', gap: 0.35 }}>
        {intDigits.map((d, i) => (
          <Box key={`oi-${i}`} component="span" className={classes.digitNeon}>
            {d}
          </Box>
        ))}
        <Typography component="span" sx={{ fontWeight: 800, color: 'rgba(92,255,138,0.9)', px: 0.1, fontSize: '1.1rem', alignSelf: 'center' }}>
          .
        </Typography>
        {fracDigits.map((d, i) => (
          <Box key={`of-${i}`} component="span" className={classes.digitNeon}>
            {d}
          </Box>
        ))}
        <Typography sx={{ ml: 0.6, fontWeight: 800, color: 'rgba(92,255,138,0.85)', fontSize: '0.65rem', alignSelf: 'center' }}>
          {distanceUnitString(distanceUnit, t)}
        </Typography>
      </Box>
    </Box>
  );
};

const NeonDashboard = ({ position, device, speedUnit, distanceUnit, t, classes, onMenuClick }) => {
  const connectionStatus = device?.status || 'unknown';
  const hasOdo = typeof position.attributes?.totalDistance === 'number';
  const course = position.course;
  const accuracyM = position.accuracy;
  const fixTime = position.fixTime;
  const batt = position.attributes?.batteryLevel;
  const ign = position.attributes?.hasOwnProperty('ignition') ? position.attributes.ignition : null;

  const statusPillBorder =
    connectionStatus === 'online'
      ? 'rgba(76, 175, 80, 0.75)'
      : connectionStatus === 'offline'
        ? 'rgba(239, 83, 80, 0.65)'
        : 'rgba(255, 167, 38, 0.65)';
  const statusPillColor =
    connectionStatus === 'online' ? '#a5d6a7' : connectionStatus === 'offline' ? '#ffcdd2' : '#ffe082';
  const statusDot =
    connectionStatus === 'online' ? '#4caf50' : connectionStatus === 'offline' ? '#ef5350' : '#ffa726';

  return (
    <Box sx={{ position: 'relative' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <NeonSpeedometer speedKnots={position.speed} speedUnit={speedUnit} t={t} />
        {hasOdo && (
          <Box sx={{ width: '100%', maxWidth: 320, mt: 1.5 }}>
            <NeonOdometer meters={position.attributes.totalDistance} distanceUnit={distanceUnit} t={t} classes={classes} />
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5, mt: 2, px: 0.5 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.85, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
          {typeof course === 'number' && (
            <Box sx={{ ...pillBaseSx, borderColor: 'rgba(66, 165, 245, 0.65)', color: '#90caf9', bgcolor: 'rgba(13,40,70,0.55)' }}>
              <NavigationIcon sx={{ fontSize: 14, transform: `rotate(${course}deg)` }} />
              {courseToCompass(course)}
            </Box>
          )}
          {typeof accuracyM === 'number' && (
            <Box sx={{ ...pillBaseSx, borderColor: 'rgba(66, 165, 245, 0.5)', color: '#81d4fa', bgcolor: 'rgba(13,40,70,0.45)' }}>
              <MyLocationIcon sx={{ fontSize: 14 }} />
              {formatDistance(accuracyM, distanceUnit, t)}
            </Box>
          )}
          {fixTime && (
            <Box sx={{ ...pillBaseSx, borderColor: 'rgba(158, 158, 158, 0.45)', color: 'rgba(200,210,220,0.85)', bgcolor: 'rgba(20,30,45,0.5)' }}>
              <ScheduleIcon sx={{ fontSize: 14 }} />
              {dayjs(fixTime).fromNow()}
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.85, alignItems: 'flex-end', flex: 1, minWidth: 0 }}>
          <Box sx={{ ...pillBaseSx, borderColor: statusPillBorder, color: statusPillColor, bgcolor: 'rgba(10,25,40,0.65)' }}>
            <FiberManualRecordIcon sx={{ fontSize: 12, color: statusDot, filter: `drop-shadow(0 0 6px ${statusDot})` }} />
            {formatStatus(connectionStatus, t)}
          </Box>
          {ign != null && (
            <Box
              sx={{
                ...pillBaseSx,
                borderColor: ign ? 'rgba(76, 175, 80, 0.5)' : 'rgba(158, 158, 158, 0.45)',
                color: ign ? '#c8e6c9' : 'rgba(180,190,200,0.85)',
                bgcolor: 'rgba(15,28,42,0.55)',
              }}
            >
              <PowerSettingsNewIcon sx={{ fontSize: 14 }} />
              {formatBoolean(ign, t)}
            </Box>
          )}
          {batt != null && (
            <Box sx={{ ...pillBaseSx, borderColor: 'rgba(76, 175, 80, 0.55)', color: '#a5d6a7', bgcolor: 'rgba(13,40,30,0.5)' }}>
              <BatteryFullIcon sx={{ fontSize: 14 }} />
              {formatPercentage(batt)}
            </Box>
          )}
        </Box>
      </Box>

      <Box sx={{ textAlign: 'center', py: 1.5, mt: 0.5 }}>
        <GpsFixedIcon
          sx={{
            fontSize: 36,
            color: '#29b6f6',
            filter: 'drop-shadow(0 0 14px rgba(41, 182, 246, 0.85))',
          }}
        />
        <Typography sx={{ fontWeight: 900, letterSpacing: 6, fontSize: '0.95rem', color: '#e3f2fd', mt: 0.25, textTransform: 'uppercase' }}>
          {t('mapTitle')}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1, mt: 0.5, mb: 1 }}>
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            py: 1,
            px: 1.5,
            borderRadius: 999,
            bgcolor: 'rgba(255,255,255,0.96)',
            color: '#0d1b2a',
            border: '1px solid rgba(100, 180, 255, 0.35)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
            minWidth: 0,
          }}
        >
          <PlaceIcon sx={{ fontSize: 20, color: '#1976d2', flexShrink: 0 }} />
          <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Lat: {position.latitude?.toFixed(6)}, Lng: {position.longitude?.toFixed(6)}
          </Typography>
        </Box>
        <IconButton
          onClick={onMenuClick}
          size="small"
          sx={{
            flexShrink: 0,
            width: 44,
            height: 44,
            borderRadius: 2,
            bgcolor: '#1976d2',
            color: '#fff',
            boxShadow: '0 0 18px rgba(25, 118, 210, 0.65)',
            '&:hover': { bgcolor: '#1565c0', boxShadow: '0 0 22px rgba(25, 118, 210, 0.85)' },
          }}
        >
          <AppsIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

const StatusRow = ({ name, content, neon }) => {
  const { classes } = useStyles({ desktopPadding: 0 });

  return (
    <TableRow>
      <TableCell className={classes.cell}>
        <Typography variant="body2" sx={neon ? { color: 'rgba(210, 230, 250, 0.95)' } : undefined}>
          {name}
        </Typography>
      </TableCell>
      <TableCell className={classes.cell}>
        <Typography
          variant="body2"
          color={neon ? undefined : 'textSecondary'}
          sx={neon ? { color: 'rgba(170, 200, 220, 0.88)' } : undefined}
        >
          {content}
        </Typography>
      </TableCell>
    </TableRow>
  );
};

const StatusCard = ({
  deviceId,
  position,
  onClose,
  disableActions,
  desktopPadding = 0,
  onGoTo,
  goToLoading,
}) => {
  const { classes } = useStyles({ desktopPadding });
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const t = useTranslation();

  const readonly = useRestriction('readonly');
  const deviceReadonly = useDeviceReadonly();

  const shareDisabled = useSelector((state) => state.session.server.attributes.disableShare);
  const user = useSelector((state) => state.session.user);
  const device = useSelector((state) => state.devices.items[deviceId]);

  const deviceImage = device?.attributes?.deviceImage;

  const positionAttributes = usePositionAttributes(t);
  const positionItems = useAttributePreference(
    'positionItems',
    'fixTime,address,speed,totalDistance',
  );

  const navigationAppLink = useAttributePreference('navigationAppLink');
  const navigationAppTitle = useAttributePreference('navigationAppTitle');
  const speedUnit = useAttributePreference('speedUnit');
  const distanceUnit = useAttributePreference('distanceUnit');

  const [anchorEl, setAnchorEl] = useState(null);

  const [removing, setRemoving] = useState(false);

  const handleRemove = useCatch(async (removed) => {
    if (removed) {
      const response = await fetchOrThrow('/api/devices');
      dispatch(devicesActions.refresh(await response.json()));
    }
    setRemoving(false);
  });

  const handleGeofence = useCatchCallback(async () => {
    const newItem = {
      name: t('sharedGeofence'),
      area: `CIRCLE (${position.latitude} ${position.longitude}, 50)`,
    };
    const response = await fetchOrThrow('/api/geofences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    });
    const item = await response.json();
    await fetchOrThrow('/api/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: position.deviceId, geofenceId: item.id }),
    });
    navigate(`/settings/geofence/${item.id}`);
  }, [navigate, position]);

  return (
    <>
      <div className={classes.root}>
        {device && (
          <Rnd
            default={{ x: 0, y: 0, width: 'auto', height: 'auto' }}
            enableResizing={false}
            dragHandleClassName="draggable-header"
            style={{ position: 'relative' }}
          >
            <Card elevation={3} className={classes.card}>
              {deviceImage ? (
                <CardMedia
                  className={`${classes.media} draggable-header`}
                  image={`/api/media/${device.uniqueId}/${deviceImage}`}
                >
                  <IconButton size="small" onClick={onClose} onTouchStart={onClose}>
                    <CloseIcon fontSize="small" className={classes.mediaButton} />
                  </IconButton>
                </CardMedia>
              ) : (
                <div className={`${classes.header} draggable-header`}>
                  <Typography variant="body2" color="textSecondary">
                    {device.name}
                  </Typography>
                  <IconButton size="small" onClick={onClose} onTouchStart={onClose} sx={{ color: '#b3e5fc' }}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </div>
              )}
              {position && (
                <CardContent className={classes.content}>
                  <NeonDashboard
                    position={position}
                    device={device}
                    speedUnit={speedUnit}
                    distanceUnit={distanceUnit}
                    t={t}
                    classes={classes}
                    onMenuClick={(e) => {
                      e.stopPropagation();
                      setAnchorEl(e.currentTarget);
                    }}
                  />
                  <Table
                    size="small"
                    classes={{ root: [classes.table, classes.neonTable].filter(Boolean).join(' ') }}
                  >
                    <TableBody>
                      {positionItems
                        .split(',')
                        .filter((key) => {
                          if (!(position.hasOwnProperty(key) || position.attributes.hasOwnProperty(key))) {
                            return false;
                          }
                          if (key === 'speed') {
                            return false;
                          }
                          if (key === 'totalDistance' && typeof position.attributes?.totalDistance === 'number') {
                            return false;
                          }
                          if (key === 'course' && typeof position.course === 'number') {
                            return false;
                          }
                          if (key === 'accuracy' && typeof position.accuracy === 'number') {
                            return false;
                          }
                          if (key === 'fixTime' && position.fixTime) {
                            return false;
                          }
                          if (key === 'ignition' && Object.prototype.hasOwnProperty.call(position.attributes, 'ignition')) {
                            return false;
                          }
                          if (key === 'batteryLevel' && position.attributes?.batteryLevel != null) {
                            return false;
                          }
                          return true;
                        })
                        .map((key) => (
                          <StatusRow
                            key={key}
                            neon
                            name={positionAttributes[key]?.name || key}
                            content={
                              <PositionValue
                                position={position}
                                property={position.hasOwnProperty(key) ? key : null}
                                attribute={position.hasOwnProperty(key) ? null : key}
                              />
                            }
                          />
                        ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={2} className={classes.cell}>
                          <Typography variant="body2">
                            <Link component={RouterLink} to={`/position/${position.id}`}>
                              {t('sharedShowDetails')}
                            </Link>
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </CardContent>
              )}
              <CardActions classes={{ root: classes.actions }} disableSpacing>
                <Tooltip title={t('sharedExtra')}>
                  <IconButton
                    color="secondary"
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    disabled={!position}
                  >
                    <PendingIcon />
                  </IconButton>
                </Tooltip>
                {onGoTo && (
                  <Tooltip title={t('sharedGoTo')}>
                    <span>
                      <IconButton
                        onClick={() => onGoTo(position)}
                        disabled={disableActions || !position || goToLoading}
                      >
                        {goToLoading ? (
                          <CircularProgress size={20} color="inherit" />
                        ) : (
                          <DirectionsIcon />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
                <Tooltip title={t('reportReplay')}>
                  <IconButton
                    onClick={() => navigate(`/replay?deviceId=${deviceId}`)}
                    disabled={disableActions || !position}
                  >
                    <RouteIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('commandTitle')}>
                  <IconButton
                    onClick={() => navigate(`/settings/device/${deviceId}/command`)}
                    disabled={disableActions}
                  >
                    <SendIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('sharedEdit')}>
                  <IconButton
                    onClick={() => navigate(`/settings/device/${deviceId}`)}
                    disabled={disableActions || deviceReadonly}
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('sharedRemove')}>
                  <IconButton
                    color="error"
                    onClick={() => setRemoving(true)}
                    disabled={disableActions || deviceReadonly}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </CardActions>
            </Card>
          </Rnd>
        )}
      </div>
      {position && (
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          {!readonly && <MenuItem onClick={handleGeofence}>{t('sharedCreateGeofence')}</MenuItem>}
          {onGoTo && (
            <MenuItem
              disabled={goToLoading}
              onClick={() => {
                setAnchorEl(null);
                onGoTo(position);
              }}
            >
              {t('sharedGoTo')}
            </MenuItem>
          )}
          <MenuItem
            component="a"
            target="_blank"
            href={`https://www.google.com/maps/search/?api=1&query=${position.latitude}%2C${position.longitude}`}
          >
            {t('linkGoogleMaps')}
          </MenuItem>
          <MenuItem
            component="a"
            target="_blank"
            href={`http://maps.apple.com/?ll=${position.latitude},${position.longitude}`}
          >
            {t('linkAppleMaps')}
          </MenuItem>
          <MenuItem
            component="a"
            target="_blank"
            href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${position.latitude}%2C${position.longitude}&heading=${position.course}`}
          >
            {t('linkStreetView')}
          </MenuItem>
          {navigationAppTitle && (
            <MenuItem
              component="a"
              target="_blank"
              href={navigationAppLink
                .replace('{latitude}', position.latitude)
                .replace('{longitude}', position.longitude)}
            >
              {navigationAppTitle}
            </MenuItem>
          )}
          {!shareDisabled && !user.temporary && (
            <MenuItem onClick={() => navigate(`/settings/device/${deviceId}/share`)}>
              <Typography color="secondary">{t('deviceShare')}</Typography>
            </MenuItem>
          )}
        </Menu>
      )}
      <RemoveDialog
        open={removing}
        endpoint="devices"
        itemId={deviceId}
        onResult={(removed) => handleRemove(removed)}
      />
    </>
  );
};

export default StatusCard;
