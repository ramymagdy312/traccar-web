import { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  LinearProgress,
  IconButton,
  Tooltip,
  InputBase,
  Chip,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { makeStyles } from 'tss-react/mui';
import SpeedIcon from '@mui/icons-material/Speed';
import LocalParkingIcon from '@mui/icons-material/LocalParking';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import BatteryAlertIcon from '@mui/icons-material/BatteryAlert';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import UpdateIcon from '@mui/icons-material/Update';
import FenceIcon from '@mui/icons-material/Fence';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import Battery20Icon from '@mui/icons-material/Battery20';
import PlaceIcon from '@mui/icons-material/Place';
import NearMeIcon from '@mui/icons-material/NearMe';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import SortByAlphaIcon from '@mui/icons-material/SortByAlpha';
import ScheduleIcon from '@mui/icons-material/Schedule';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useAttributePreference } from '../common/util/preferences';
import { formatSpeed, formatStatus } from '../common/util/formatter';
import { mapIconKey, mapIcons } from '../map/core/preloadImages';
import { devicesActions } from '../store';

dayjs.extend(relativeTime);

/** Light-mode dashboard tints (reference: soft mobile fleet UI) */
const DASHBOARD_LIGHT_PASTEL = {
  motionCardBg: '#E3F2FD',
  motionAccent: '#1976D2',
  stopsCardBg: '#F3E5F5',
  stopsAccent: '#7B1FA2',
  softShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
  softShadowHover: '0 6px 16px rgba(0, 0, 0, 0.08)',
};

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
    backgroundColor: theme.palette.background.default,
    '&::-webkit-scrollbar': { width: 4 },
    '&::-webkit-scrollbar-thumb': {
      background: theme.palette.mode === 'dark'
        ? alpha(theme.palette.common.white, 0.12)
        : alpha(theme.palette.common.black, 0.12),
      borderRadius: 2,
    },
  },
  statusRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: theme.spacing(1.25),
  },
  deviceHero: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.75),
    padding: theme.spacing(1.75, 2),
    cursor: 'pointer',
    transition: 'transform 0.18s ease, box-shadow 0.2s ease',
    ...(theme.palette.mode === 'light'
      ? {
        borderRadius: 18,
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
        boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.28)}`,
        border: 'none',
        color: theme.palette.primary.contrastText,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.36)}`,
        },
      }
      : {
        borderRadius: 12,
        border: `1px solid ${theme.palette.divider}`,
        borderLeftWidth: 3,
        borderLeftColor: theme.palette.primary.main,
        backgroundColor: theme.palette.background.paper,
        boxShadow: theme.palette.mode === 'dark'
          ? '0 1px 2px rgba(0,0,0,0.32), 0 2px 8px rgba(0,0,0,0.2)'
          : '0 1px 2px rgba(15, 23, 42, 0.04), 0 2px 6px rgba(15, 23, 42, 0.06)',
        '&:hover': {
          borderColor: theme.palette.divider,
          borderLeftColor: theme.palette.primary.main,
          boxShadow: theme.palette.mode === 'dark'
            ? '0 2px 8px rgba(0,0,0,0.35)'
            : '0 2px 8px rgba(15, 23, 42, 0.08), 0 4px 14px rgba(15, 23, 42, 0.06)',
          transform: 'translateY(-1px)',
        },
      }),
  },
  deviceHeroIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  metricCard: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.25),
    padding: theme.spacing(1.25, 1.5),
    minWidth: 0,
    borderRadius: theme.palette.mode === 'light' ? 16 : 12,
    cursor: 'pointer',
    transition: 'box-shadow 0.2s ease, border-color 0.2s ease, transform 0.15s ease',
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: theme.palette.mode === 'dark'
      ? '0 1px 2px rgba(0,0,0,0.32), 0 2px 8px rgba(0,0,0,0.2)'
      : '0 1px 2px rgba(15, 23, 42, 0.04), 0 2px 6px rgba(15, 23, 42, 0.06)',
    '&:hover': {
      borderColor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.14) : alpha(theme.palette.common.black, 0.1),
      boxShadow: theme.palette.mode === 'dark'
        ? '0 2px 8px rgba(0,0,0,0.35)'
        : '0 2px 8px rgba(15, 23, 42, 0.08), 0 4px 14px rgba(15, 23, 42, 0.06)',
      transform: 'translateY(-1px)',
    },
  },
  metricIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  metricValue: {
    fontWeight: 600,
    fontSize: '1.35rem',
    lineHeight: 1.15,
    letterSpacing: '-0.02em',
    color: theme.palette.text.primary,
  },
  metricLabel: {
    fontSize: '0.7rem',
    color: theme.palette.text.secondary,
    fontWeight: 500,
    lineHeight: 1.2,
    marginTop: 2,
  },
  section: {
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.palette.mode === 'light' ? 16 : 12,
    padding: theme.spacing(1.5),
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: theme.palette.mode === 'light'
      ? DASHBOARD_LIGHT_PASTEL.softShadow
      : theme.palette.mode === 'dark'
        ? '0 1px 2px rgba(0,0,0,0.32), 0 2px 8px rgba(0,0,0,0.2)'
        : '0 1px 2px rgba(15, 23, 42, 0.04), 0 2px 6px rgba(15, 23, 42, 0.06)',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(1.25),
  },
  sectionTitle: {
    fontWeight: 600,
    fontSize: '0.8125rem',
    letterSpacing: '0.01em',
    color: theme.palette.text.primary,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.75),
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
    padding: theme.spacing(1.25, 1),
    borderRadius: theme.palette.mode === 'light' ? 12 : 10,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.mode === 'dark'
      ? alpha(theme.palette.common.white, 0.03)
      : theme.palette.mode === 'light'
        ? theme.palette.background.paper
        : alpha(theme.palette.common.black, 0.02),
  },
  speedValue: {
    fontWeight: 600,
    fontSize: '1.05rem',
    letterSpacing: '-0.02em',
    color: theme.palette.mode === 'light' ? theme.palette.primary.main : theme.palette.text.primary,
  },
  speedLabel: {
    fontSize: '0.65rem',
    color: theme.palette.text.secondary,
    fontWeight: 500,
    marginTop: 4,
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
  deviceItemSelected: {
    backgroundColor: `${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.08)} !important`,
    borderInlineStart: `3px solid ${theme.palette.primary.main}`,
    '&:hover': {
      backgroundColor: `${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.12)} !important`,
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
  deviceCategoryIcon: {
    width: 20,
    height: 20,
    flexShrink: 0,
    display: 'block',
  },
}));


const DonutChart = ({ data, size = 80, strokeWidth = 10 }) => {
  const theme = useTheme();
  const trackColor = theme.palette.mode === 'dark'
    ? alpha(theme.palette.common.white, 0.1)
    : alpha(theme.palette.text.primary, 0.08);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ color: theme.palette.text.primary }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
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

const Dashboard = ({ onFilterMap }) => {
  const { classes } = useStyles();
  const theme = useTheme();
  const t = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const dash = useMemo(
    () => ({
      online: theme.palette.success.main,
      offline: theme.palette.error.main,
      unknown: theme.palette.warning.main,
      primary: theme.palette.primary.main,
      primaryLight: theme.palette.primary.light,
      secondary: theme.palette.secondary.main,
      secondaryLight: theme.palette.secondary.light,
      info: theme.palette.info.main,
      infoLight: theme.palette.info.light,
      geofence: theme.palette.info.main,
      geofenceLight: theme.palette.info.light,
    }),
    [theme],
  );

  const speedUnit = useAttributePreference('speedUnit');

  const devices = useSelector((state) => state.devices.items);
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  const positions = useSelector((state) => state.session.positions);
  const groups = useSelector((state) => state.groups.items);
  const geofences = useSelector((state) => state.geofences.items);

  const stats = useMemo(() => {
    const devList = Object.values(devices);
    const posList = Object.values(positions);

    const onlineDevices = devList.filter((d) => d.status === 'online');
    const offlineDevices = devList.filter((d) => d.status === 'offline')
      .sort((a, b) => new Date(a.lastUpdate || 0) - new Date(b.lastUpdate || 0));
    const unknownDevices = devList.filter((d) => d.status === 'unknown')
      .sort((a, b) => new Date(a.lastUpdate || 0) - new Date(b.lastUpdate || 0));
    const online = onlineDevices.length;
    const offline = offlineDevices.length;
    const unknown = unknownDevices.length;
    const total = devList.length;

    const movingPositions = posList.filter((p) => p.attributes?.motion || p.speed > 0);
    const movingDeviceIds = new Set(movingPositions.map((p) => p.deviceId));
    const moving = movingDeviceIds.size;
    const parked = total - moving;

    const movingDevicesList = devList.filter((d) => movingDeviceIds.has(d.id));
    const parkedDevicesList = devList.filter((d) => !movingDeviceIds.has(d.id));

    const speeds = posList.map((p) => p.speed || 0);
    const maxSpeed = speeds.length ? Math.max(...speeds) : 0;
    const movingSpeeds = speeds.filter((s) => s > 0);
    const avgMovingSpeed = movingSpeeds.length
      ? movingSpeeds.reduce((a, b) => a + b, 0) / movingSpeeds.length
      : 0;

    const lowBattery = posList.filter(
      (p) => p.attributes?.batteryLevel !== undefined && p.attributes.batteryLevel <= 20,
    ).length;

    const groupCounts = {};
    const groupDevices = {};
    devList.forEach((d) => {
      const gName = d.groupId && groups[d.groupId] ? groups[d.groupId].name : t('groupNoGroup');
      groupCounts[gName] = (groupCounts[gName] || 0) + 1;
      if (!groupDevices[gName]) groupDevices[gName] = [];
      groupDevices[gName].push(d);
    });

    const categoryCounts = {};
    const categoryDevices = {};
    devList.forEach((d) => {
      const cat = d.category || 'default';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      if (!categoryDevices[cat]) categoryDevices[cat] = [];
      categoryDevices[cat].push(d);
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

    const outsideGeofenceDevicesList = devList.filter((d) => !devicesInAnyGeofence.has(d.id));
    const insideGeofenceDevicesList = devList.filter((d) => devicesInAnyGeofence.has(d.id));

    return {
      online, offline, unknown, total,
      moving, parked,
      maxSpeed, avgMovingSpeed,
      lowBattery,
      groupCounts, groupDevices, categoryCounts, categoryDevices,
      topSpeed, lowBatteryDevices, staleDevices,
      geofenceStats, devicesInAnyGeofence: devicesInAnyGeofence.size, devicesOutsideGeofences,
      onlineDevices, offlineDevices, unknownDevices,
      movingDevicesList, parkedDevicesList,
      outsideGeofenceDevicesList, insideGeofenceDevicesList,
    };
  }, [devices, positions, groups, geofences, t]);


  const activityCards = useMemo(
    () => {
      const light = theme.palette.mode === 'light';
      return [
        {
          count: stats.moving,
          label: t('positionMotion'),
          filterKey: 'moving',
          icon: <SpeedIcon sx={{ fontSize: 22 }} />,
          accent: light ? DASHBOARD_LIGHT_PASTEL.motionAccent : dash.primary,
          cardBg: light ? DASHBOARD_LIGHT_PASTEL.motionCardBg : null,
        },
        {
          count: stats.parked,
          label: t('reportStops'),
          filterKey: 'parked',
          icon: <LocalParkingIcon sx={{ fontSize: 22 }} />,
          accent: light ? DASHBOARD_LIGHT_PASTEL.stopsAccent : dash.secondary,
          cardBg: light ? DASHBOARD_LIGHT_PASTEL.stopsCardBg : null,
        },
      ];
    },
    [stats.moving, stats.parked, t, theme.palette.mode, dash.primary, dash.secondary],
  );


  const sortedGroups = Object.entries(stats.groupCounts).sort((a, b) => b[1] - a[1]);
  const sortedCategories = Object.entries(stats.categoryCounts).sort((a, b) => b[1] - a[1]);

  const [drillDown, setDrillDown] = useState(null);
  const [drillSearch, setDrillSearch] = useState('');
  const [drillFilter, setDrillFilter] = useState('all');
  const [drillSort, setDrillSort] = useState('name');

  const donutData = useMemo(
    () => [
      { label: t('deviceStatusOnline'), value: stats.online, color: dash.online },
      { label: t('deviceStatusOffline'), value: stats.offline, color: dash.offline },
      { label: t('deviceStatusUnknown'), value: stats.unknown, color: dash.unknown },
    ],
    [stats.online, stats.offline, stats.unknown, t, dash.online, dash.offline, dash.unknown],
  );

  const allDevicesList = useMemo(() => Object.values(devices), [devices]);

  const drillDownLists = useMemo(() => ({
        all: allDevicesList,
        online: stats.onlineDevices,
        offline: stats.offlineDevices,
        unknown: stats.unknownDevices,
        moving: stats.movingDevicesList,
        parked: stats.parkedDevicesList,
        insideGeofence: stats.insideGeofenceDevicesList,
        outsideGeofence: stats.outsideGeofenceDevicesList,
      }), [allDevicesList, stats]);

  const openDrillDown = (filterKey, label, color) => {
    setDrillSearch('');
    setDrillFilter('all');
    setDrillSort('name');
    setDrillDown({ filterKey, label, color });
  };

  const drillDownDeviceIds = useMemo(() => {
    if (!drillDown) return null;
    let base;
    if (drillDown.filterKey.startsWith('geofence-')) {
      base = (stats.geofenceStats.find((g) => `geofence-${g.id}` === drillDown.filterKey)?.deviceIds || [])
        .map((dId) => devices[dId]).filter(Boolean);
    } else if (drillDown.filterKey.startsWith('group-')) {
      base = stats.groupDevices[drillDown.filterKey.slice(6)] || [];
    } else if (drillDown.filterKey.startsWith('category-')) {
      base = stats.categoryDevices[drillDown.filterKey.slice(9)] || [];
    } else {
      base = drillDownLists[drillDown.filterKey] || [];
    }
    return new Set(base.map((d) => d.id));
  }, [drillDown, stats, devices, drillDownLists]);

  useEffect(() => {
    if (onFilterMap) {
      onFilterMap(drillDownDeviceIds);
    }
  }, [drillDownDeviceIds, onFilterMap]);

  const renderCardRow = (cards) => (
    <div className={classes.statusRow}>
      {cards.map((card) => (
        <Box
          key={card.label}
          className={classes.metricCard}
          onClick={() => openDrillDown(card.filterKey, card.label, card.accent)}
          sx={
            card.cardBg
              ? {
                backgroundColor: card.cardBg,
                border: '1px solid rgba(0,0,0,0.04)',
                boxShadow: DASHBOARD_LIGHT_PASTEL.softShadow,
                '&:hover': {
                  boxShadow: DASHBOARD_LIGHT_PASTEL.softShadowHover,
                  transform: 'translateY(-2px)',
                  borderColor: 'rgba(0,0,0,0.06)',
                },
              }
              : undefined
          }
        >
          <Box
            className={classes.metricIconWrap}
            sx={(t) => ({
              backgroundColor: alpha(
                card.accent,
                t.palette.mode === 'dark' ? 0.22 : card.cardBg ? 0.18 : 0.12,
              ),
              color: card.accent,
            })}
          >
            {card.icon}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              className={classes.metricValue}
              sx={card.cardBg ? { color: card.accent } : undefined}
            >
              {card.count}
            </Typography>
            <Typography className={classes.metricLabel}>{card.label}</Typography>
          </Box>
        </Box>
      ))}
    </div>
  );

  const selectDevice = (id) => dispatch(devicesActions.selectId(id));
  const deviceRowClassName = (id) =>
    [classes.deviceItem, selectedDeviceId === id && classes.deviceItemSelected].filter(Boolean).join(' ');

  if (drillDown) {
    let baseList;
    if (drillDown.filterKey.startsWith('geofence-')) {
      baseList = (stats.geofenceStats.find((g) => `geofence-${g.id}` === drillDown.filterKey)?.deviceIds || [])
        .map((dId) => devices[dId]).filter(Boolean);
    } else if (drillDown.filterKey.startsWith('group-')) {
      const groupName = drillDown.filterKey.slice(6);
      baseList = stats.groupDevices[groupName] || [];
    } else if (drillDown.filterKey.startsWith('category-')) {
      const catName = drillDown.filterKey.slice(9);
      baseList = stats.categoryDevices[catName] || [];
    } else {
      baseList = drillDownLists[drillDown.filterKey] || [];
    }

    const subFilterFn = (d) => {
      if (drillFilter === 'all') return true;
      if (drillFilter === 'moving') return positions[d.id]?.attributes?.motion || (positions[d.id]?.speed || 0) > 0;
      if (drillFilter === 'stopped') return !(positions[d.id]?.attributes?.motion || (positions[d.id]?.speed || 0) > 0);
      if (drillFilter === 'online') return d.status === 'online';
      if (drillFilter === 'offline') return d.status === 'offline';
      if (drillFilter === 'unknown') return d.status === 'unknown';
      return true;
    };

    const fullList = baseList.filter(subFilterFn);

    const searchLower = drillSearch.trim().toLowerCase();
    const filtered = searchLower
      ? fullList.filter((d) =>
        d.name?.toLowerCase().includes(searchLower)
        || d.uniqueId?.toLowerCase().includes(searchLower)
        || d.phone?.toLowerCase().includes(searchLower))
      : fullList;

    const list = [...filtered].sort((a, b) => {
      if (drillSort === 'name') return (a.name || '').localeCompare(b.name || '');
      if (drillSort === 'lastUpdate') return new Date(b.lastUpdate || 0) - new Date(a.lastUpdate || 0);
      return 0;
    });

    const filterChips = [
      { key: 'all', label: 'All', count: baseList.length, color: dash.primary },
      { key: 'moving', label: t('positionMotion'), count: baseList.filter((d) => positions[d.id]?.attributes?.motion || (positions[d.id]?.speed || 0) > 0).length, color: dash.primary },
      { key: 'stopped', label: t('reportStops'), count: baseList.filter((d) => !(positions[d.id]?.attributes?.motion || (positions[d.id]?.speed || 0) > 0)).length, color: dash.secondary },
      { key: 'online', label: t('deviceStatusOnline'), count: baseList.filter((d) => d.status === 'online').length, color: dash.online },
      { key: 'offline', label: t('deviceStatusOffline'), count: baseList.filter((d) => d.status === 'offline').length, color: dash.offline },
    ];

    return (
      <div className={classes.root}>
        <Box
          sx={{
            borderRadius: '12px',
            padding: theme.spacing(1.5),
            background: `linear-gradient(135deg, ${drillDown.color} 0%, ${alpha(drillDown.color, 0.88)} 100%)`,
            color: theme.palette.getContrastText(drillDown.color),
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <IconButton size="small" sx={{ color: 'inherit' }} onClick={() => setDrillDown(null)}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.1 }}>{drillDown.label}</Typography>
            <Typography sx={{ fontSize: '0.65rem', opacity: 0.85 }}>
              {baseList.length}
              {' '}
              {t('deviceTitle').toLowerCase()}
            </Typography>
          </Box>
        </Box>

        {/* Filter chips */}
        <Box
          sx={{
            display: 'flex',
            gap: 0.75,
            overflowX: 'auto',
            pb: 0.5,
            '&::-webkit-scrollbar': { height: 0 },
          }}
        >
          {filterChips.map((chip) => (
            <Chip
              key={chip.key}
              label={`${chip.label} ${chip.count}`}
              size="small"
              onClick={() => setDrillFilter(chip.key)}
              sx={(theme) => ({
                fontWeight: 600,
                fontSize: '0.68rem',
                borderRadius: 20,
                flexShrink: 0,
                ...(drillFilter === chip.key
                  ? {
                    background: chip.color,
                    color: theme.palette.getContrastText(chip.color),
                    '&:hover': { background: chip.color },
                  }
                  : {
                    background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    border: `1px solid ${theme.palette.divider}`,
                    color: theme.palette.text.primary,
                  }),
              })}
            />
          ))}
        </Box>

        {/* Search */}
        <Box
          sx={(theme) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            borderRadius: 10,
            padding: theme.spacing(0.5, 1.25),
            background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            border: `1px solid ${theme.palette.divider}`,
          })}
        >
          <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <InputBase
            placeholder={t('sharedSearch')}
            value={drillSearch}
            onChange={(e) => setDrillSearch(e.target.value)}
            sx={{ flex: 1, fontSize: '0.8rem' }}
            autoFocus
          />
          {drillSearch && (
            <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
              {list.length}
              /
              {fullList.length}
            </Typography>
          )}
          <Tooltip title={drillSort === 'name' ? t('deviceLastUpdate') : t('sharedName')}>
            <IconButton
              size="small"
              onClick={() => setDrillSort(drillSort === 'name' ? 'lastUpdate' : 'name')}
              sx={{ flexShrink: 0 }}
            >
              {drillSort === 'name'
                ? <SortByAlphaIcon sx={{ fontSize: 18 }} />
                : <ScheduleIcon sx={{ fontSize: 18 }} />}
            </IconButton>
          </Tooltip>
        </Box>

        <Box className={classes.section} sx={{ flex: 1, overflowY: 'auto' }}>
          {list.length === 0 ? (
            <Typography sx={{ textAlign: 'center', color: 'text.secondary', fontSize: '0.8rem', py: 3 }}>
              {t('sharedNoResults')}
            </Typography>
          ) : list.map((d) => {
            const pos = positions[d.id];
            const speed = pos?.speed || 0;
            const connectionStatus = d.status || 'unknown';
            const statusColor = connectionStatus === 'online'
              ? dash.online
              : connectionStatus === 'offline'
                ? dash.offline
                : dash.unknown;
            const showLastSeen = connectionStatus !== 'online' && d.lastUpdate;
            const categoryIconUrl = mapIcons[mapIconKey(d.category)];
            return (
              <Box
                key={d.id}
                className={deviceRowClassName(d.id)}
                onClick={() => selectDevice(d.id)}
                sx={{ flexDirection: 'column', alignItems: 'stretch', flexWrap: 'nowrap' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', minWidth: 0 }}>
                  <Box
                    className={classes.deviceCategoryIcon}
                    role="presentation"
                    sx={{
                      backgroundColor: statusColor,
                      maskImage: `url(${JSON.stringify(categoryIconUrl)})`,
                      maskSize: 'contain',
                      maskRepeat: 'no-repeat',
                      maskPosition: 'center',
                      WebkitMaskImage: `url(${JSON.stringify(categoryIconUrl)})`,
                      WebkitMaskSize: 'contain',
                      WebkitMaskRepeat: 'no-repeat',
                      WebkitMaskPosition: 'center',
                    }}
                  />
                  <Typography className={classes.deviceName}>{d.name}</Typography>
                  {speed > 0 && (
                    <Typography
                      className={classes.deviceBadge}
                      sx={{
                        background: alpha(drillDown.color, 0.14),
                        color: drillDown.color,
                        flexShrink: 0,
                      }}
                    >
                      {formatSpeed(speed, speedUnit, t)}
                    </Typography>
                  )}
                </Box>
                <Box
                  sx={(theme) => ({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    flexWrap: 'wrap',
                    gap: 0.5,
                    mt: 0.25,
                    width: '100%',
                    minWidth: 0,
                    textAlign: 'start',
                    paddingInlineStart: `calc(20px + ${theme.spacing(1)})`,
                  })}
                >
                  <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: statusColor, lineHeight: 1.2 }}>
                    {formatStatus(connectionStatus, t)}
                  </Typography>
                  {showLastSeen && (
                    <Typography sx={{ fontSize: '0.58rem', color: 'text.secondary', fontWeight: 500, lineHeight: 1.2 }}>
                      {dayjs(d.lastUpdate).fromNow()}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      </div>
    );
  }

  return (
    <div className={classes.root}>
      {/* Total devices — same card language as the rest of the dashboard */}
      <Box
        className={classes.deviceHero}
        onClick={() => openDrillDown('all', t('deviceTitle'), dash.primary)}
      >
        <Box
          className={classes.deviceHeroIcon}
          sx={(t) => (t.palette.mode === 'light'
            ? {
              backgroundColor: alpha('#ffffff', 0.22),
              color: '#ffffff',
            }
            : {
              backgroundColor: alpha(t.palette.primary.main, 0.22),
              color: t.palette.primary.main,
            })}
        >
          <DirectionsCarIcon sx={{ fontSize: 26 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: '1.5rem',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              color: theme.palette.mode === 'light' ? '#ffffff' : 'text.primary',
            }}
          >
            {stats.total}
          </Typography>
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: 500,
              mt: 0.25,
              color: theme.palette.mode === 'light' ? alpha('#ffffff', 0.88) : 'text.secondary',
            }}
          >
            {t('deviceTitle')}
          </Typography>
        </Box>
        <Tooltip title={t('reportTitle')}>
          <IconButton
            size="small"
            sx={{
              color: theme.palette.mode === 'light' ? alpha('#ffffff', 0.88) : 'text.secondary',
            }}
            onClick={(e) => { e.stopPropagation(); navigate('/reports/combined'); }}
          >
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
            {donutData.map((d, idx) => {
              const keys = ['online', 'offline', 'unknown'];
              return (
                <Box
                  key={d.label}
                  className={classes.legendItem}
                  onClick={() => openDrillDown(keys[idx], d.label, d.color)}
                  sx={{ cursor: 'pointer', borderRadius: 1, px: 0.5, '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <Box className={classes.legendDot} sx={{ bgcolor: d.color }} />
                  <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{d.label}</Typography>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700 }}>{d.value}</Typography>
                </Box>
              );
            })}
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
            <Box
              key={d.id}
              className={deviceRowClassName(d.id)}
              onClick={() => selectDevice(d.id)}
            >
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  background: idx === 0
                    ? `linear-gradient(135deg, ${theme.palette.error.dark}, ${theme.palette.error.main})`
                    : alpha(theme.palette.text.primary, 0.06),
                  color: idx === 0 ? theme.palette.error.contrastText : 'text.secondary',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                }}
              >
                {idx + 1}
              </Box>
              <Typography className={classes.deviceName}>{d.name}</Typography>
              <Typography
                className={classes.deviceBadge}
                sx={{
                  background: idx === 0 ? alpha(theme.palette.error.main, 0.12) : alpha(theme.palette.text.primary, 0.06),
                  color: idx === 0 ? theme.palette.error.main : 'text.primary',
                }}
              >
                {formatSpeed(d.speed, speedUnit, t)}
              </Typography>
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
            <Box
              onClick={() => openDrillDown('insideGeofence', `${t('sharedGeofences')} — Inside`, dash.geofence)}
              sx={{
                flex: 1,
                borderRadius: 10,
                padding: theme.spacing(1),
                background: alpha(dash.geofence, theme.palette.mode === 'dark' ? 0.14 : 0.08),
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s',
                '&:hover': { transform: 'scale(1.02)' },
              }}
            >
              <PlaceIcon sx={{ fontSize: 16, color: dash.geofence, mb: 0.25 }} />
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: dash.geofence }}>{stats.devicesInAnyGeofence}</Typography>
              <Typography sx={{ fontSize: '0.55rem', color: 'text.secondary' }}>Inside</Typography>
            </Box>
            <Box
              onClick={() => openDrillDown('outsideGeofence', `${t('sharedGeofences')} — Outside`, dash.unknown)}
              sx={{
                flex: 1,
                borderRadius: 10,
                padding: theme.spacing(1),
                background: alpha(dash.unknown, theme.palette.mode === 'dark' ? 0.14 : 0.08),
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s',
                '&:hover': { transform: 'scale(1.02)' },
              }}
            >
              <NearMeIcon sx={{ fontSize: 16, color: dash.unknown, mb: 0.25 }} />
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: dash.unknown }}>{stats.devicesOutsideGeofences}</Typography>
              <Typography sx={{ fontSize: '0.55rem', color: 'text.secondary' }}>Outside</Typography>
            </Box>
          </Box>

          {/* Per-geofence list */}
          {stats.geofenceStats.map((gf) => (
            <Box
              key={gf.id}
              className={classes.barRow}
              onClick={() => openDrillDown(`geofence-${gf.id}`, gf.name, dash.geofence)}
              sx={{ cursor: 'pointer', borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
            >
              <Typography className={classes.barLabel} sx={{ minWidth: 72 }}>{gf.name}</Typography>
              <LinearProgress
                variant="determinate"
                value={stats.total > 0 ? (gf.deviceCount / stats.total) * 100 : 0}
                className={classes.bar}
                sx={{
                  bgcolor: alpha(theme.palette.text.primary, 0.06),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    background: gf.deviceCount > 0
                      ? `linear-gradient(90deg, ${dash.geofence}, ${dash.geofenceLight})`
                      : alpha(theme.palette.text.primary, 0.08),
                  },
                }}
              />
              <Typography className={classes.barValue} sx={{ color: gf.deviceCount > 0 ? dash.geofence : 'text.secondary' }}>
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
          {stats.staleDevices.map((d) => {
            const connectionStatus = d.status || 'unknown';
            const statusColor = connectionStatus === 'online'
              ? dash.online
              : connectionStatus === 'offline'
                ? dash.offline
                : dash.unknown;
            return (
              <Box
                key={d.id}
                className={deviceRowClassName(d.id)}
                onClick={() => selectDevice(d.id)}
                sx={{ flexDirection: 'column', alignItems: 'stretch', flexWrap: 'nowrap' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', minWidth: 0 }}>
                  <WarningAmberIcon sx={{ fontSize: 14, color: statusColor, flexShrink: 0 }} />
                  <Typography className={classes.deviceName}>{d.name}</Typography>
                  <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', whiteSpace: 'nowrap', flexShrink: 0, ml: 'auto' }}>
                    {dayjs(d.lastUpdate).fromNow()}
                  </Typography>
                </Box>
                <Box
                  sx={(theme) => ({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    flexWrap: 'wrap',
                    gap: 0.5,
                    mt: 0.25,
                    width: '100%',
                    textAlign: 'start',
                    paddingInlineStart: `calc(14px + ${theme.spacing(1)})`,
                  })}
                >
                  <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: statusColor, lineHeight: 1.2 }}>
                    {formatStatus(connectionStatus, t)}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Low battery devices */}
      {stats.lowBatteryDevices.length > 0 && (
        <Box className={classes.section}>
          <Box className={classes.sectionHeader}>
            <Typography className={classes.sectionTitle} sx={{ color: theme.palette.error.main }}>
              <BatteryAlertIcon sx={{ fontSize: 14, color: 'inherit' }} />
              {t('positionBatteryLevel')}
            </Typography>
            <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
              {stats.lowBattery} {t('deviceTitle').toLowerCase()}
            </Typography>
          </Box>
          {stats.lowBatteryDevices.map((d) => (
            <Box
              key={d.id}
              className={deviceRowClassName(d.id)}
              onClick={() => selectDevice(d.id)}
            >
              {d.level <= 20
                ? <Battery20Icon sx={{ fontSize: 16, color: theme.palette.error.main }} />
                : <BatteryFullIcon sx={{ fontSize: 16, color: theme.palette.warning.main }} />}
              <Typography className={classes.deviceName}>{d.name}</Typography>
              <Typography
                className={classes.deviceBadge}
                sx={{
                  background: d.level <= 10
                    ? alpha(theme.palette.error.main, 0.12)
                    : d.level <= 20
                      ? alpha(theme.palette.warning.main, 0.14)
                      : alpha(theme.palette.warning.main, 0.1),
                  color: d.level <= 10 ? theme.palette.error.main : theme.palette.warning.dark,
                }}
              >
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
            <Box
              key={name}
              className={classes.barRow}
              onClick={() => openDrillDown(`group-${name}`, name, dash.primary)}
              sx={{ cursor: 'pointer', borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
            >
              <Typography className={classes.barLabel}>{name}</Typography>
              <LinearProgress
                variant="determinate"
                value={stats.total > 0 ? (count / stats.total) * 100 : 0}
                className={classes.bar}
                sx={{
                  bgcolor: alpha(theme.palette.text.primary, 0.06),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    background: `linear-gradient(90deg, ${dash.primary}, ${dash.primaryLight})`,
                  },
                }}
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
            <Box
              key={name}
              className={classes.barRow}
              onClick={() => openDrillDown(`category-${name}`, name, dash.info)}
              sx={{ cursor: 'pointer', borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
            >
              <Typography className={classes.barLabel}>{name}</Typography>
              <LinearProgress
                variant="determinate"
                value={stats.total > 0 ? (count / stats.total) * 100 : 0}
                className={classes.bar}
                sx={{
                  bgcolor: alpha(theme.palette.text.primary, 0.06),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    background: `linear-gradient(90deg, ${dash.info}, ${dash.infoLight})`,
                  },
                }}
              />
              <Typography className={classes.barValue}>{count}</Typography>
            </Box>
          ))}
        </Box>
      )}

    </div>
  );
};

export default Dashboard;
