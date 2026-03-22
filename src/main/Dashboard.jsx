import { useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import SignalWifiOffIcon from '@mui/icons-material/SignalWifiOff';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SpeedIcon from '@mui/icons-material/Speed';
import LocalParkingIcon from '@mui/icons-material/LocalParking';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import BatteryAlertIcon from '@mui/icons-material/BatteryAlert';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import UpdateIcon from '@mui/icons-material/Update';
import FenceIcon from '@mui/icons-material/Fence';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import Battery20Icon from '@mui/icons-material/Battery20';
import PlaceIcon from '@mui/icons-material/Place';
import NearMeIcon from '@mui/icons-material/NearMe';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useAttributePreference } from '../common/util/preferences';
import { formatSpeed } from '../common/util/formatter';
import { devicesActions } from '../store';

dayjs.extend(relativeTime);

const useStyles = makeStyles()((theme) => ({
  root: {
    padding: theme.spacing(1.5),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1.5),
    overflowY: 'auto',
    height: '100%',
    width: '100%',
    boxSizing: 'border-box',
    '&::-webkit-scrollbar': { width: 4 },
    '&::-webkit-scrollbar-thumb': { background: 'rgba(0,0,0,0.1)', borderRadius: 2 },
  },
  statusRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: theme.spacing(1),
  },
  statusCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: theme.spacing(1.5, 1),
    borderRadius: 14,
    cursor: 'pointer',
    transition: 'transform 0.15s, box-shadow 0.15s',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: theme.palette.mode === 'dark'
        ? '0 6px 20px rgba(0,0,0,0.4)'
        : '0 6px 20px rgba(0,0,0,0.1)',
    },
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing(0.75),
  },
  count: {
    fontWeight: 700,
    fontSize: '1.25rem',
    lineHeight: 1.2,
  },
  label: {
    fontSize: '0.65rem',
    color: theme.palette.text.secondary,
    fontWeight: 500,
    textAlign: 'center',
  },
  section: {
    background: theme.palette.background.paper,
    borderRadius: 14,
    padding: theme.spacing(1.5),
    boxShadow: theme.palette.mode === 'dark'
      ? '0 2px 8px rgba(0,0,0,0.3)'
      : '0 2px 8px rgba(0,0,0,0.04)',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(1),
  },
  sectionTitle: {
    fontWeight: 700,
    fontSize: '0.8rem',
    color: theme.palette.text.primary,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  },
  barRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(0.75),
  },
  barLabel: {
    fontSize: '0.7rem',
    fontWeight: 500,
    minWidth: 56,
    color: theme.palette.text.secondary,
  },
  barValue: {
    fontSize: '0.7rem',
    fontWeight: 700,
    minWidth: 24,
    textAlign: 'right',
  },
  bar: {
    flex: 1,
    height: 7,
    borderRadius: 4,
  },
  eventRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(0.5, 0),
    borderBottom: `1px solid ${theme.palette.divider}`,
    '&:last-child': { borderBottom: 'none' },
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  eventText: {
    fontSize: '0.7rem',
    color: theme.palette.text.secondary,
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  eventTime: {
    fontSize: '0.65rem',
    color: theme.palette.text.secondary,
    opacity: 0.7,
    flexShrink: 0,
  },
  speedGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: theme.spacing(1),
    marginTop: theme.spacing(0.5),
  },
  speedStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: theme.spacing(1),
    borderRadius: 10,
    background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
  },
  speedValue: {
    fontWeight: 700,
    fontSize: '1.1rem',
    color: theme.palette.primary.main,
  },
  speedLabel: {
    fontSize: '0.6rem',
    color: theme.palette.text.secondary,
    fontWeight: 500,
  },
  donutWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(2),
    padding: theme.spacing(1, 0),
  },
  donutLegend: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.5),
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.75),
    fontSize: '0.7rem',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  deviceItem: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(0.6, 0.5),
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background 0.15s',
    '&:hover': {
      background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    },
    '&:not(:last-child)': {
      borderBottom: `1px solid ${theme.palette.divider}`,
    },
  },
  deviceName: {
    fontSize: '0.7rem',
    fontWeight: 600,
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  deviceBadge: {
    fontSize: '0.6rem',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: 6,
    whiteSpace: 'nowrap',
  },
}));

const eventColors = {
  deviceOnline: '#2e7d32',
  deviceOffline: '#d32f2f',
  deviceMoving: '#1565c0',
  deviceStopped: '#ed6c02',
  alarm: '#d32f2f',
  geofenceEnter: '#00897b',
  geofenceExit: '#7b1fa2',
  ignitionOn: '#2e7d32',
  ignitionOff: '#757575',
  default: '#9e9e9e',
};

const DonutChart = ({ data, size = 80, strokeWidth = 10 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={strokeWidth} />
      {data.filter((d) => d.value > 0).map((d) => {
        const dash = (d.value / total) * circumference;
        const gap = circumference - dash;
        const currentOffset = offset;
        offset += dash;
        return (
          <circle
            key={d.label}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={d.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-currentOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.5s, stroke-dashoffset 0.5s' }}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
      })}
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" style={{ fontSize: '1rem', fontWeight: 700, fill: 'currentColor' }}>
        {total}
      </text>
    </svg>
  );
};

const Dashboard = () => {
  const { classes } = useStyles();
  const t = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const speedUnit = useAttributePreference('speedUnit');

  const devices = useSelector((state) => state.devices.items);
  const positions = useSelector((state) => state.session.positions);
  const events = useSelector((state) => state.events.items);
  const groups = useSelector((state) => state.groups.items);
  const geofences = useSelector((state) => state.geofences.items);

  const stats = useMemo(() => {
    const devList = Object.values(devices);
    const posList = Object.values(positions);

    const online = devList.filter((d) => d.status === 'online').length;
    const offline = devList.filter((d) => d.status === 'offline').length;
    const unknown = devList.filter((d) => d.status === 'unknown').length;
    const total = devList.length;

    const moving = posList.filter((p) => p.attributes?.motion || p.speed > 0).length;
    const parked = total - moving;

    const speeds = posList.map((p) => p.speed || 0);
    const maxSpeed = speeds.length ? Math.max(...speeds) : 0;
    const movingSpeeds = speeds.filter((s) => s > 0);
    const avgMovingSpeed = movingSpeeds.length
      ? movingSpeeds.reduce((a, b) => a + b, 0) / movingSpeeds.length
      : 0;

    const lowBattery = posList.filter(
      (p) => p.attributes?.batteryLevel !== undefined && p.attributes.batteryLevel <= 20,
    ).length;

    const ignitionOn = posList.filter((p) => p.attributes?.ignition === true).length;

    const groupCounts = {};
    devList.forEach((d) => {
      const gName = d.groupId && groups[d.groupId] ? groups[d.groupId].name : t('groupNoGroup');
      groupCounts[gName] = (groupCounts[gName] || 0) + 1;
    });

    const categoryCounts = {};
    devList.forEach((d) => {
      const cat = d.category || 'default';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const topSpeed = devList
      .map((d) => {
        const p = positions[d.id];
        return p ? { name: d.name, id: d.id, speed: p.speed || 0 } : null;
      })
      .filter((x) => x && x.speed > 0)
      .sort((a, b) => b.speed - a.speed)
      .slice(0, 5);

    const lowBatteryDevices = devList
      .map((d) => {
        const p = positions[d.id];
        return p?.attributes?.batteryLevel !== undefined
          ? { name: d.name, id: d.id, level: p.attributes.batteryLevel }
          : null;
      })
      .filter((x) => x && x.level <= 30)
      .sort((a, b) => a.level - b.level)
      .slice(0, 5);

    const staleDevices = devList
      .filter((d) => d.lastUpdate)
      .map((d) => ({ name: d.name, id: d.id, lastUpdate: d.lastUpdate, status: d.status }))
      .sort((a, b) => new Date(a.lastUpdate) - new Date(b.lastUpdate))
      .slice(0, 5);

    const geofenceDeviceMap = {};
    posList.forEach((p) => {
      if (p.geofenceIds?.length) {
        p.geofenceIds.forEach((gfId) => {
          if (!geofenceDeviceMap[gfId]) {
            geofenceDeviceMap[gfId] = new Set();
          }
          geofenceDeviceMap[gfId].add(p.deviceId);
        });
      }
    });

    const geofenceStats = Object.values(geofences)
      .map((gf) => ({
        id: gf.id,
        name: gf.name,
        deviceCount: geofenceDeviceMap[gf.id]?.size || 0,
        deviceIds: geofenceDeviceMap[gf.id] ? [...geofenceDeviceMap[gf.id]] : [],
      }))
      .sort((a, b) => b.deviceCount - a.deviceCount);

    const devicesInAnyGeofence = new Set();
    posList.forEach((p) => {
      if (p.geofenceIds?.length) devicesInAnyGeofence.add(p.deviceId);
    });
    const devicesOutsideGeofences = total - devicesInAnyGeofence.size;

    return {
      online, offline, unknown, total,
      moving, parked, ignitionOn,
      maxSpeed, avgMovingSpeed,
      lowBattery,
      groupCounts, categoryCounts,
      topSpeed, lowBatteryDevices, staleDevices,
      geofenceStats, devicesInAnyGeofence: devicesInAnyGeofence.size, devicesOutsideGeofences,
    };
  }, [devices, positions, groups, geofences, t]);

  const recentEvents = useMemo(() => events.slice(0, 8), [events]);

  const statusCards = [
    {
      count: stats.online, label: t('deviceStatusOnline'),
      icon: <GpsFixedIcon sx={{ fontSize: 20 }} />,
      bg: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
      bgDark: 'linear-gradient(135deg, #1b3a1f 0%, #2e5232 100%)',
      iconBg: '#2e7d32', color: '#2e7d32',
    },
    {
      count: stats.offline, label: t('deviceStatusOffline'),
      icon: <SignalWifiOffIcon sx={{ fontSize: 20 }} />,
      bg: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
      bgDark: 'linear-gradient(135deg, #3a1b1b 0%, #52302e 100%)',
      iconBg: '#d32f2f', color: '#d32f2f',
    },
    {
      count: stats.unknown, label: t('deviceStatusUnknown'),
      icon: <HelpOutlineIcon sx={{ fontSize: 20 }} />,
      bg: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
      bgDark: 'linear-gradient(135deg, #3a2e1b 0%, #524632 100%)',
      iconBg: '#ed6c02', color: '#ed6c02',
    },
  ];

  const activityCards = [
    {
      count: stats.moving, label: t('positionMotion'),
      icon: <SpeedIcon sx={{ fontSize: 20 }} />,
      bg: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
      bgDark: 'linear-gradient(135deg, #1a2a3a 0%, #2a4060 100%)',
      iconBg: '#1565c0', color: '#1565c0',
    },
    {
      count: stats.parked, label: t('reportStops'),
      icon: <LocalParkingIcon sx={{ fontSize: 20 }} />,
      bg: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
      bgDark: 'linear-gradient(135deg, #2a1a3a 0%, #3d2a52 100%)',
      iconBg: '#7b1fa2', color: '#7b1fa2',
    },
    {
      count: stats.ignitionOn, label: t('positionIgnition'),
      icon: <PowerSettingsNewIcon sx={{ fontSize: 20 }} />,
      bg: 'linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%)',
      bgDark: 'linear-gradient(135deg, #1a3a36 0%, #2a524e 100%)',
      iconBg: '#00897b', color: '#00897b',
    },
  ];

  const formatEventTime = (time) => {
    if (!time) return '';
    return new Date(time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const sortedGroups = Object.entries(stats.groupCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const sortedCategories = Object.entries(stats.categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const donutData = [
    { label: t('deviceStatusOnline'), value: stats.online, color: '#2e7d32' },
    { label: t('deviceStatusOffline'), value: stats.offline, color: '#d32f2f' },
    { label: t('deviceStatusUnknown'), value: stats.unknown, color: '#ed6c02' },
  ];

  const renderCardRow = (cards) => (
    <div className={classes.statusRow}>
      {cards.map((card) => (
        <Box
          key={card.label}
          className={classes.statusCard}
          sx={(theme) => ({
            background: theme.palette.mode === 'dark' ? card.bgDark : card.bg,
          })}
        >
          <Box className={classes.iconWrap} sx={{ background: `${card.iconBg}18` }}>
            <Box sx={{ color: card.iconBg }}>{card.icon}</Box>
          </Box>
          <Typography className={classes.count} sx={{ color: card.color }}>
            {card.count}
          </Typography>
          <Typography className={classes.label}>{card.label}</Typography>
        </Box>
      ))}
    </div>
  );

  const selectDevice = (id) => dispatch(devicesActions.selectId(id));

  return (
    <div className={classes.root}>
      {/* Total devices header */}
      <Box
        sx={(theme) => ({
          borderRadius: '14px',
          padding: theme.spacing(1.5),
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #0d2137 0%, #1a3a5c 100%)'
            : 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          py: 1.5,
          boxShadow: theme.palette.mode === 'dark'
            ? '0 4px 16px rgba(0,0,0,0.4)'
            : '0 4px 16px rgba(21,101,192,0.3)',
        })}
      >
        <Box sx={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <DirectionsCarIcon sx={{ fontSize: 26 }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1.5rem', lineHeight: 1.1 }}>{stats.total}</Typography>
          <Typography sx={{ fontSize: '0.7rem', opacity: 0.85 }}>{t('deviceTitle')}</Typography>
        </Box>
        <Tooltip title={t('reportTitle')}>
          <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.7)' }} onClick={() => navigate('/reports/combined')}>
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Donut chart + status cards */}
      <Box className={classes.section}>
        <Box className={classes.sectionHeader}>
          <Typography className={classes.sectionTitle}>{t('deviceStatus')}</Typography>
        </Box>
        <Box className={classes.donutWrap}>
          <DonutChart data={donutData} />
          <Box className={classes.donutLegend}>
            {donutData.map((d) => (
              <Box key={d.label} className={classes.legendItem}>
                <Box className={classes.legendDot} sx={{ bgcolor: d.color }} />
                <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{d.label}</Typography>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700 }}>{d.value}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Activity cards */}
      {renderCardRow(activityCards)}

      {/* Speed stats */}
      <Box className={classes.section}>
        <Box className={classes.sectionHeader}>
          <Typography className={classes.sectionTitle}>
            <SpeedIcon sx={{ fontSize: 14 }} />
            {t('positionSpeed')}
          </Typography>
        </Box>
        <Box className={classes.speedGrid}>
          <Box className={classes.speedStat}>
            <Typography className={classes.speedValue}>{formatSpeed(stats.maxSpeed, speedUnit, t)}</Typography>
            <Typography className={classes.speedLabel}>Max</Typography>
          </Box>
          <Box className={classes.speedStat}>
            <Typography className={classes.speedValue}>{formatSpeed(stats.avgMovingSpeed, speedUnit, t)}</Typography>
            <Typography className={classes.speedLabel}>Avg Moving</Typography>
          </Box>
        </Box>
      </Box>

      {/* Top speed devices */}
      {stats.topSpeed.length > 0 && (
        <Box className={classes.section}>
          <Box className={classes.sectionHeader}>
            <Typography className={classes.sectionTitle}>
              <SpeedIcon sx={{ fontSize: 14 }} />
              Fastest Now
            </Typography>
          </Box>
          {stats.topSpeed.map((d, idx) => (
            <Box key={d.id} className={classes.deviceItem} onClick={() => selectDevice(d.id)}>
              <Box sx={{ width: 20, height: 20, borderRadius: 6, background: idx === 0 ? 'linear-gradient(135deg, #d32f2f, #f44336)' : 'rgba(0,0,0,0.06)', color: idx === 0 ? '#fff' : 'text.secondary', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700 }}>
                {idx + 1}
              </Box>
              <Typography className={classes.deviceName}>{d.name}</Typography>
              <Typography className={classes.deviceBadge} sx={{ background: idx === 0 ? '#ffebee' : 'rgba(0,0,0,0.04)', color: idx === 0 ? '#d32f2f' : 'text.primary' }}>
                {formatSpeed(d.speed, speedUnit, t)}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Low battery devices */}
      {stats.lowBatteryDevices.length > 0 && (
        <Box className={classes.section}>
          <Box className={classes.sectionHeader}>
            <Typography className={classes.sectionTitle}>
              <BatteryAlertIcon sx={{ fontSize: 14, color: '#d32f2f' }} />
              <span style={{ color: '#d32f2f' }}>{t('positionBatteryLevel')}</span>
            </Typography>
            <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
              {stats.lowBattery} {t('deviceTitle').toLowerCase()}
            </Typography>
          </Box>
          {stats.lowBatteryDevices.map((d) => (
            <Box key={d.id} className={classes.deviceItem} onClick={() => selectDevice(d.id)}>
              {d.level <= 20
                ? <Battery20Icon sx={{ fontSize: 16, color: '#d32f2f' }} />
                : <BatteryFullIcon sx={{ fontSize: 16, color: '#ed6c02' }} />}
              <Typography className={classes.deviceName}>{d.name}</Typography>
              <Typography className={classes.deviceBadge} sx={{ background: d.level <= 10 ? '#ffebee' : d.level <= 20 ? '#fff3e0' : '#fffde7', color: d.level <= 10 ? '#d32f2f' : d.level <= 20 ? '#ed6c02' : '#f9a825' }}>
                {d.level}%
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Groups breakdown */}
      {sortedGroups.length > 0 && (
        <Box className={classes.section}>
          <Box className={classes.sectionHeader}>
            <Typography className={classes.sectionTitle}>{t('settingsGroups')}</Typography>
          </Box>
          {sortedGroups.map(([name, count]) => (
            <Box key={name} className={classes.barRow}>
              <Typography className={classes.barLabel}>{name}</Typography>
              <LinearProgress
                variant="determinate"
                value={stats.total > 0 ? (count / stats.total) * 100 : 0}
                className={classes.bar}
                sx={{ bgcolor: 'rgba(0,0,0,0.06)', '& .MuiLinearProgress-bar': { borderRadius: 4, background: 'linear-gradient(90deg, #1565c0, #42a5f5)' } }}
              />
              <Typography className={classes.barValue}>{count}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Categories */}
      {sortedCategories.length > 1 && (
        <Box className={classes.section}>
          <Box className={classes.sectionHeader}>
            <Typography className={classes.sectionTitle}>{t('sharedType')}</Typography>
          </Box>
          {sortedCategories.map(([name, count]) => (
            <Box key={name} className={classes.barRow}>
              <Typography className={classes.barLabel}>{name}</Typography>
              <LinearProgress
                variant="determinate"
                value={stats.total > 0 ? (count / stats.total) * 100 : 0}
                className={classes.bar}
                sx={{ bgcolor: 'rgba(0,0,0,0.06)', '& .MuiLinearProgress-bar': { borderRadius: 4, background: 'linear-gradient(90deg, #00897b, #4dd0e1)' } }}
              />
              <Typography className={classes.barValue}>{count}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Geofences */}
      {Object.keys(geofences).length > 0 && (
        <Box className={classes.section}>
          <Box className={classes.sectionHeader}>
            <Typography className={classes.sectionTitle}>
              <FenceIcon sx={{ fontSize: 14 }} />
              {t('sharedGeofences')}
            </Typography>
            <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
              {Object.keys(geofences).length} {t('sharedGeofences').toLowerCase()}
            </Typography>
          </Box>

          {/* Summary row */}
          <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
            <Box sx={(theme) => ({
              flex: 1, borderRadius: 10, padding: theme.spacing(1),
              background: theme.palette.mode === 'dark' ? 'rgba(0,137,123,0.12)' : 'rgba(0,137,123,0.06)',
              textAlign: 'center',
            })}
            >
              <PlaceIcon sx={{ fontSize: 16, color: '#00897b', mb: 0.25 }} />
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#00897b' }}>{stats.devicesInAnyGeofence}</Typography>
              <Typography sx={{ fontSize: '0.55rem', color: 'text.secondary' }}>Inside</Typography>
            </Box>
            <Box sx={(theme) => ({
              flex: 1, borderRadius: 10, padding: theme.spacing(1),
              background: theme.palette.mode === 'dark' ? 'rgba(237,108,2,0.12)' : 'rgba(237,108,2,0.06)',
              textAlign: 'center',
            })}
            >
              <NearMeIcon sx={{ fontSize: 16, color: '#ed6c02', mb: 0.25 }} />
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#ed6c02' }}>{stats.devicesOutsideGeofences}</Typography>
              <Typography sx={{ fontSize: '0.55rem', color: 'text.secondary' }}>Outside</Typography>
            </Box>
          </Box>

          {/* Per-geofence list */}
          {stats.geofenceStats.map((gf) => (
            <Box key={gf.id} className={classes.barRow}>
              <Typography className={classes.barLabel} sx={{ minWidth: 72 }}>{gf.name}</Typography>
              <LinearProgress
                variant="determinate"
                value={stats.total > 0 ? (gf.deviceCount / stats.total) * 100 : 0}
                className={classes.bar}
                sx={{
                  bgcolor: 'rgba(0,0,0,0.06)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    background: gf.deviceCount > 0
                      ? 'linear-gradient(90deg, #00897b, #4dd0e1)'
                      : 'rgba(0,0,0,0.1)',
                  },
                }}
              />
              <Typography className={classes.barValue} sx={{ color: gf.deviceCount > 0 ? '#00897b' : 'text.secondary' }}>
                {gf.deviceCount}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Stale / Last update devices */}
      {stats.staleDevices.length > 0 && (
        <Box className={classes.section}>
          <Box className={classes.sectionHeader}>
            <Typography className={classes.sectionTitle}>
              <UpdateIcon sx={{ fontSize: 14 }} />
              {t('deviceLastUpdate')}
            </Typography>
          </Box>
          {stats.staleDevices.map((d) => (
            <Box key={d.id} className={classes.deviceItem} onClick={() => selectDevice(d.id)}>
              <WarningAmberIcon sx={{ fontSize: 14, color: d.status === 'offline' ? '#d32f2f' : '#ed6c02' }} />
              <Typography className={classes.deviceName}>{d.name}</Typography>
              <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                {dayjs(d.lastUpdate).fromNow()}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Recent events */}
      {recentEvents.length > 0 && (
        <Box className={classes.section}>
          <Box className={classes.sectionHeader}>
            <Typography className={classes.sectionTitle}>
              <NotificationsActiveIcon sx={{ fontSize: 14 }} />
              {t('reportEvents')}
            </Typography>
            <Tooltip title={t('reportTitle')}>
              <IconButton size="small" onClick={() => navigate('/reports/event')}>
                <OpenInNewIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          </Box>
          {recentEvents.map((event) => {
            const device = devices[event.deviceId];
            return (
              <Box key={event.id} className={classes.eventRow}>
                <Box className={classes.eventDot} sx={{ bgcolor: eventColors[event.type] || eventColors.default }} />
                <Typography className={classes.eventText}>
                  <b>{device?.name || `#${event.deviceId}`}</b>
                  {' — '}
                  {t(`event${event.type.charAt(0).toUpperCase()}${event.type.slice(1)}`, { defaultValue: event.type })}
                </Typography>
                <Typography className={classes.eventTime}>
                  {formatEventTime(event.eventTime || event.serverTime)}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}
    </div>
  );
};

export default Dashboard;
