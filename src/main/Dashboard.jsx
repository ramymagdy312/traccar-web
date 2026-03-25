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
import { makeStyles } from 'tss-react/mui';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import SignalWifiOffIcon from '@mui/icons-material/SignalWifiOff';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SpeedIcon from '@mui/icons-material/Speed';
import LocalParkingIcon from '@mui/icons-material/LocalParking';
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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DirectionsCarFilledIcon from '@mui/icons-material/DirectionsCarFilled';
import SearchIcon from '@mui/icons-material/Search';
import SortByAlphaIcon from '@mui/icons-material/SortByAlpha';
import ScheduleIcon from '@mui/icons-material/Schedule';
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

const Dashboard = ({ onFilterMap }) => {
  const { classes } = useStyles();
  const t = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const speedUnit = useAttributePreference('speedUnit');

  const devices = useSelector((state) => state.devices.items);
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

    const ignitionOnIds = new Set(
      posList.filter((p) => p.attributes?.ignition === true).map((p) => p.deviceId),
    );
    const ignitionOnDevicesList = devList.filter((d) => ignitionOnIds.has(d.id));

    const speeds = posList.map((p) => p.speed || 0);
    const maxSpeed = speeds.length ? Math.max(...speeds) : 0;
    const movingSpeeds = speeds.filter((s) => s > 0);
    const avgMovingSpeed = movingSpeeds.length
      ? movingSpeeds.reduce((a, b) => a + b, 0) / movingSpeeds.length
      : 0;

    const lowBattery = posList.filter(
      (p) => p.attributes?.batteryLevel !== undefined && p.attributes.batteryLevel <= 20,
    ).length;

    const ignitionOn = ignitionOnIds.size;

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
      moving, parked, ignitionOn,
      maxSpeed, avgMovingSpeed,
      lowBattery,
      groupCounts, groupDevices, categoryCounts, categoryDevices,
      topSpeed, lowBatteryDevices, staleDevices,
      geofenceStats, devicesInAnyGeofence: devicesInAnyGeofence.size, devicesOutsideGeofences,
      onlineDevices, offlineDevices, unknownDevices,
      movingDevicesList, parkedDevicesList, ignitionOnDevicesList,
      outsideGeofenceDevicesList, insideGeofenceDevicesList,
    };
  }, [devices, positions, groups, geofences, t]);


  const statusCards = [
    {
      count: stats.online, label: t('deviceStatusOnline'), filterKey: 'online',
      icon: <GpsFixedIcon sx={{ fontSize: 20 }} />,
      bg: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
      bgDark: 'linear-gradient(135deg, #1b3a1f 0%, #2e5232 100%)',
      iconBg: '#2e7d32', color: '#2e7d32',
    },
    {
      count: stats.offline, label: t('deviceStatusOffline'), filterKey: 'offline',
      icon: <SignalWifiOffIcon sx={{ fontSize: 20 }} />,
      bg: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
      bgDark: 'linear-gradient(135deg, #3a1b1b 0%, #52302e 100%)',
      iconBg: '#d32f2f', color: '#d32f2f',
    },
    {
      count: stats.unknown, label: t('deviceStatusUnknown'), filterKey: 'unknown',
      icon: <HelpOutlineIcon sx={{ fontSize: 20 }} />,
      bg: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
      bgDark: 'linear-gradient(135deg, #3a2e1b 0%, #524632 100%)',
      iconBg: '#ed6c02', color: '#ed6c02',
    },
  ];

  const activityCards = [
    {
      count: stats.moving, label: t('positionMotion'), filterKey: 'moving',
      icon: <SpeedIcon sx={{ fontSize: 20 }} />,
      bg: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
      bgDark: 'linear-gradient(135deg, #1a2a3a 0%, #2a4060 100%)',
      iconBg: '#1565c0', color: '#1565c0',
    },
    {
      count: stats.parked, label: t('reportStops'), filterKey: 'parked',
      icon: <LocalParkingIcon sx={{ fontSize: 20 }} />,
      bg: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
      bgDark: 'linear-gradient(135deg, #2a1a3a 0%, #3d2a52 100%)',
      iconBg: '#7b1fa2', color: '#7b1fa2',
    },
    {
      count: stats.ignitionOn, label: t('positionIgnition'), filterKey: 'ignition',
      icon: <PowerSettingsNewIcon sx={{ fontSize: 20 }} />,
      bg: 'linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%)',
      bgDark: 'linear-gradient(135deg, #1a3a36 0%, #2a524e 100%)',
      iconBg: '#00897b', color: '#00897b',
    },
  ];


  const sortedGroups = Object.entries(stats.groupCounts).sort((a, b) => b[1] - a[1]);
  const sortedCategories = Object.entries(stats.categoryCounts).sort((a, b) => b[1] - a[1]);

  const [drillDown, setDrillDown] = useState(null);
  const [drillSearch, setDrillSearch] = useState('');
  const [drillFilter, setDrillFilter] = useState('all');
  const [drillSort, setDrillSort] = useState('name');

  const donutData = [
    { label: t('deviceStatusOnline'), value: stats.online, color: '#2e7d32' },
    { label: t('deviceStatusOffline'), value: stats.offline, color: '#d32f2f' },
    { label: t('deviceStatusUnknown'), value: stats.unknown, color: '#ed6c02' },
  ];

  const allDevicesList = useMemo(() => Object.values(devices), [devices]);

  const drillDownLists = {
    all: allDevicesList,
    online: stats.onlineDevices,
    offline: stats.offlineDevices,
    unknown: stats.unknownDevices,
    moving: stats.movingDevicesList,
    parked: stats.parkedDevicesList,
    ignition: stats.ignitionOnDevicesList,
    insideGeofence: stats.insideGeofenceDevicesList,
    outsideGeofence: stats.outsideGeofenceDevicesList,
  };

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
          className={classes.statusCard}
          onClick={() => openDrillDown(card.filterKey, card.label, card.color)}
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
      { key: 'all', label: 'All', count: baseList.length, color: '#1565c0' },
      { key: 'moving', label: t('positionMotion'), count: baseList.filter((d) => positions[d.id]?.attributes?.motion || (positions[d.id]?.speed || 0) > 0).length, color: '#1565c0' },
      { key: 'stopped', label: t('reportStops'), count: baseList.filter((d) => !(positions[d.id]?.attributes?.motion || (positions[d.id]?.speed || 0) > 0)).length, color: '#7b1fa2' },
      { key: 'online', label: t('deviceStatusOnline'), count: baseList.filter((d) => d.status === 'online').length, color: '#2e7d32' },
      { key: 'offline', label: t('deviceStatusOffline'), count: baseList.filter((d) => d.status === 'offline').length, color: '#d32f2f' },
    ];

    return (
      <div className={classes.root}>
        <Box
          sx={(theme) => ({
            borderRadius: '14px',
            padding: theme.spacing(1.5),
            background: drillDown.color,
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          })}
        >
          <IconButton size="small" sx={{ color: '#fff' }} onClick={() => setDrillDown(null)}>
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
                    color: '#fff',
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
            const showOfflineSince = (drillDown.filterKey === 'offline' || drillDown.filterKey === 'unknown') && d.lastUpdate;
            return (
              <Box key={d.id} className={classes.deviceItem} onClick={() => selectDevice(d.id)} sx={{ flexWrap: 'wrap' }}>
                <DirectionsCarFilledIcon sx={{ fontSize: 16, color: drillDown.color }} />
                <Typography className={classes.deviceName}>{d.name}</Typography>
                {speed > 0 && (
                  <Typography className={classes.deviceBadge} sx={{ background: `${drillDown.color}18`, color: drillDown.color }}>
                    {formatSpeed(speed, speedUnit, t)}
                  </Typography>
                )}
                {showOfflineSince && (
                  <Typography sx={{ fontSize: '0.6rem', color: drillDown.color, whiteSpace: 'nowrap', fontWeight: 600 }}>
                    {dayjs(d.lastUpdate).fromNow()}
                  </Typography>
                )}
                {!showOfflineSince && (
                  <Box
                    sx={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      bgcolor: d.status === 'online' ? '#2e7d32' : d.status === 'offline' ? '#d32f2f' : '#ed6c02',
                    }}
                  />
                )}
              </Box>
            );
          })}
        </Box>
      </div>
    );
  }

  return (
    <div className={classes.root}>
      {/* Total devices header — clickable to show all */}
      <Box
        onClick={() => openDrillDown('all', t('deviceTitle'), '#1565c0')}
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
          cursor: 'pointer',
          transition: 'transform 0.15s, box-shadow 0.15s',
          '&:hover': { transform: 'translateY(-1px)' },
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
          <IconButton
            size="small"
            sx={{ color: 'rgba(255,255,255,0.7)' }}
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
            <Box
              key={name}
              className={classes.barRow}
              onClick={() => openDrillDown(`group-${name}`, name, '#1565c0')}
              sx={{ cursor: 'pointer', borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
            >
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
            <Box
              key={name}
              className={classes.barRow}
              onClick={() => openDrillDown(`category-${name}`, name, '#00897b')}
              sx={{ cursor: 'pointer', borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
            >
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
            <Box
              onClick={() => openDrillDown('insideGeofence', `${t('sharedGeofences')} — Inside`, '#00897b')}
              sx={(theme) => ({
                flex: 1, borderRadius: 10, padding: theme.spacing(1),
                background: theme.palette.mode === 'dark' ? 'rgba(0,137,123,0.12)' : 'rgba(0,137,123,0.06)',
                textAlign: 'center', cursor: 'pointer',
                transition: 'transform 0.15s',
                '&:hover': { transform: 'scale(1.03)' },
              })}
            >
              <PlaceIcon sx={{ fontSize: 16, color: '#00897b', mb: 0.25 }} />
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#00897b' }}>{stats.devicesInAnyGeofence}</Typography>
              <Typography sx={{ fontSize: '0.55rem', color: 'text.secondary' }}>Inside</Typography>
            </Box>
            <Box
              onClick={() => openDrillDown('outsideGeofence', `${t('sharedGeofences')} — Outside`, '#ed6c02')}
              sx={(theme) => ({
                flex: 1, borderRadius: 10, padding: theme.spacing(1),
                background: theme.palette.mode === 'dark' ? 'rgba(237,108,2,0.12)' : 'rgba(237,108,2,0.06)',
                textAlign: 'center', cursor: 'pointer',
                transition: 'transform 0.15s',
                '&:hover': { transform: 'scale(1.03)' },
              })}
            >
              <NearMeIcon sx={{ fontSize: 16, color: '#ed6c02', mb: 0.25 }} />
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#ed6c02' }}>{stats.devicesOutsideGeofences}</Typography>
              <Typography sx={{ fontSize: '0.55rem', color: 'text.secondary' }}>Outside</Typography>
            </Box>
          </Box>

          {/* Per-geofence list */}
          {stats.geofenceStats.map((gf) => (
            <Box
              key={gf.id}
              className={classes.barRow}
              onClick={() => openDrillDown(`geofence-${gf.id}`, gf.name, '#00897b')}
              sx={{ cursor: 'pointer', borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
            >
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

    </div>
  );
};

export default Dashboard;
