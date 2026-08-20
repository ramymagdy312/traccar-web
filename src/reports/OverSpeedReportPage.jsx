import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from '@mui/material';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import LocationSearchingIcon from '@mui/icons-material/LocationSearching';
import RouteIcon from '@mui/icons-material/Route';
import SpeedIcon from '@mui/icons-material/Speed';
import StraightenIcon from '@mui/icons-material/Straighten';
import TimerIcon from '@mui/icons-material/Timer';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import {
  formatAddress,
  formatDistance,
  formatSpeed,
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
import scheduleReport from './common/scheduleReport';
import MapScale from '../map/MapScale';
import fetchOrThrow from '../common/util/fetchOrThrow';
import exportExcel from '../common/util/exportExcel';
import { deviceEquality } from '../common/util/deviceEquality';

const columnsArray = [
  ['startTime', 'reportStartTime'],
  ['endTime', 'reportEndTime'],
  ['startAddress', 'reportStartAddress'],
  ['endAddress', 'reportEndAddress'],
  ['distance', 'sharedDistance'],
  ['averageSpeed', 'reportAverageSpeed'],
  ['maxSpeed', 'reportMaximumSpeed'],
  ['duration', 'reportDuration'],
  ['driverName', 'sharedDriver'],
];

const columnsMap = new Map(columnsArray);

const speedOptions = [
  { label: '90 km/h', value: 48.596 },
  { label: '100 km/h', value: 53.996 },
  { label: '110 km/h', value: 59.395 },
  { label: '115 km/h', value: 62.095 },
  { label: '120 km/h', value: 64.795 },
];

const OverSpeedReportPage = () => {
  const navigate = useNavigate();
  const { classes } = useReportStyles();
  const t = useTranslation();
  const theme = useTheme();

  const distanceUnit = useAttributePreference('distanceUnit');
  const speedUnit = useAttributePreference('speedUnit');
  const coordinateFormat = usePreference('coordinateFormat');

  const devices = useSelector((state) => state.devices.items, deviceEquality(['id', 'name']));

  const [columns, setColumns] = usePersistedState(
    'overSpeedColumns',
    columnsArray.map(([key]) => key),
  );

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [route, setRoute] = useState(null);
  const [speedLimit, setSpeedLimit] = useState(speedOptions[1].value);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [sortConfig, setSortConfig] = useState(null);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (!prev || prev.key !== key) {
        return { key, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  };

  const getSortValue = (item, key) => {
    switch (key) {
      case 'deviceName':
        return devices[item.deviceId]?.name || '';
      case 'startTime':
      case 'endTime':
        return new Date(item[key] || 0).getTime();
      case 'distance':
      case 'averageSpeed':
      case 'maxSpeed':
      case 'duration':
        return Number(item[key]) || 0;
      default:
        return item[key] ?? '';
    }
  };

  const compareValues = (a, b) => {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }
    return String(a).localeCompare(String(b));
  };

  const sortItems = (list, key, direction) => {
    if (!key || !direction) return list;
    const dir = direction === 'desc' ? -1 : 1;
    return [...list].sort((a, b) => compareValues(getSortValue(a, key), getSortValue(b, key)) * dir);
  };

  const toggleGroup = (deviceId) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [deviceId]: !prev[deviceId],
    }));
  };

  const setAllExpanded = (expanded) => {
    setExpandedGroups((prev) => {
      const next = { ...prev };
      items.forEach((item) => {
        next[item.deviceId] = expanded;
      });
      return next;
    });
  };

  const isGroupExpanded = (deviceId) => expandedGroups[deviceId] === true;

  const speedLimitFilter = useMemo(() => (
    <FormControl
      variant="outlined"
      size="small"
      sx={{ width: 150, ml: 2 }}
    >
      <InputLabel>{t('sharedSpeedLimit')}</InputLabel>
      <Select
        value={speedLimit}
        onChange={(e) => setSpeedLimit(e.target.value)}
        label={t('sharedSpeedLimit')}
      >
        {speedOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  ), [speedLimit, t]);

  const createMarkers = () => ([
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
  ]);

  useEffectAsync(async () => {
    if (selectedItem) {
      const query = new URLSearchParams({
        deviceId: selectedItem.deviceId,
        from: selectedItem.startTime,
        to: selectedItem.endTime,
      });

      const response = await fetch(`/api/reports/route?${query.toString()}`, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        setRoute(await response.json());
      } else {
        throw Error(await response.text());
      }
    } else {
      setRoute(null);
    }
  }, [selectedItem]);

  const buildQuery = (deviceIds, groupIds, from, to) => {
    const query = new URLSearchParams({ from, to });

    deviceIds.forEach((deviceId) => query.append('deviceId', deviceId));
    groupIds.forEach((groupId) => query.append('groupId', groupId));
    query.append('speedLimit', speedLimit);

    return query;
  };

  const onShow = useCatch(async ({ deviceIds, groupIds, from, to }) => {
    setSelectedItem(null);
    setRoute(null);
    setExpandedGroups({});
    setLoading(true);

    try {
      const query = buildQuery(deviceIds, groupIds, from, to);
      const response = await fetchOrThrow(
        `/api/reports/overSpeed?${query.toString()}`,
        {
          headers: { Accept: 'application/json' },
        },
      );

      setItems(await response.json());
    } finally {
      setLoading(false);
    }
  });

  const onExport = useCatch(async ({ deviceIds, groupIds, from, to }) => {
    const query = buildQuery(deviceIds, groupIds, from, to);
    const response = await fetchOrThrow(`/api/reports/overSpeed?${query.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    const exportItems = await response.json();

    const itemSortKey = sortConfig?.key && sortConfig.key !== 'deviceName'
      ? sortConfig.key
      : 'startTime';
    const itemSortDirection = sortConfig?.key && sortConfig.key !== 'deviceName'
      ? sortConfig.direction
      : 'asc';
    const groupSortDirection = sortConfig?.key === 'deviceName' && sortConfig.direction
      ? sortConfig.direction
      : 'asc';
    const groupDir = groupSortDirection === 'desc' ? -1 : 1;
    const itemDir = itemSortDirection === 'desc' ? -1 : 1;

    const sortedExportItems = [...exportItems].sort((a, b) => {
      const nameA = devices[a.deviceId]?.name || '';
      const nameB = devices[b.deviceId]?.name || '';
      const nameCompare = compareValues(nameA, nameB) * groupDir;
      if (nameCompare !== 0) {
        return nameCompare;
      }
      return compareValues(getSortValue(a, itemSortKey), getSortValue(b, itemSortKey)) * itemDir;
    });
    const sheets = new Map();
    sortedExportItems.forEach((item) => {
      const deviceName = devices[item.deviceId]?.name || t('sharedUnknown');
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
    await exportExcel(t('reportSpeedExcess'), 'speed-excess.xlsx', sheets, theme);
  });

  const onSchedule = useCatch(async (deviceIds, groupIds, report) => {
    report.type = 'overSpeed';
    const error = await scheduleReport(deviceIds, groupIds, report);

    if (error) {
      throw Error(error);
    } else {
      navigate('/reports/scheduled');
    }
  });

  const formatValue = (item, key) => {
    const value = item[key];

    switch (key) {
      case 'deviceName':
        return devices[item.deviceId]?.name || t('sharedUnknown');
      case 'startTime':
      case 'endTime':
        return formatTime(value, 'minutes');
      case 'distance':
        return formatDistance(value, distanceUnit, t);
      case 'averageSpeed':
      case 'maxSpeed':
        return value > 0 ? formatSpeed(value, speedUnit, t) : null;
      case 'duration':
        return formatNumericHours(value, t);
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
          <AddressValue
            latitude={item.endLat}
            longitude={item.endLon}
            originalAddress={value}
          />
        );
      default:
        return value;
    }
  };

  const groupedItems = useMemo(() => {
    const groupMap = new Map();
    items.forEach((item) => {
      const id = item.deviceId;
      if (!groupMap.has(id)) {
        groupMap.set(id, {
          deviceId: id,
          deviceName: devices[id]?.name || t('sharedUnknown'),
          items: [],
          maxSpeed: 0,
          totalDuration: 0,
          totalDistance: 0,
        });
      }
      const group = groupMap.get(id);
      group.items.push(item);
      group.maxSpeed = Math.max(group.maxSpeed, item.maxSpeed || 0);
      group.totalDuration += item.duration || 0;
      group.totalDistance += item.distance || 0;
    });

    const groups = Array.from(groupMap.values());

    const itemSortKey = sortConfig?.key && sortConfig.key !== 'deviceName'
      ? sortConfig.key
      : 'startTime';
    const itemSortDirection = sortConfig?.key && sortConfig.key !== 'deviceName'
      ? sortConfig.direction
      : 'asc';

    groups.forEach((group) => {
      group.items = sortItems(group.items, itemSortKey, itemSortDirection || 'asc');
    });

    const groupSortDirection = sortConfig?.key === 'deviceName' && sortConfig.direction
      ? sortConfig.direction
      : 'asc';
    const groupDir = groupSortDirection === 'desc' ? -1 : 1;
    groups.sort((a, b) => compareValues(a.deviceName, b.deviceName) * groupDir);

    return groups;
  }, [items, devices, t, sortConfig]);

  return (
    <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'reportSpeedExcess']} >
      <div className={classes.container}>
        {selectedItem && (
          <div className={classes.containerMap}>
            <MapView>
              <MapGeofence />
              {route && (
                <>
                  <MapRoutePath positions={route} />
                  <MapMarkers markers={createMarkers()} />
                  <MapCamera positions={route} />
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
              <ColumnSelect columns={columns} setColumns={setColumns}columnsArray={columnsArray} />
              {speedLimitFilter}
            </ReportFilter>
          </div>
          {!loading && groupedItems.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1,
                px: 2,
                py: 1,
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Chip
                  size="small"
                  color="primary"
                  variant="outlined"
                  icon={<DirectionsCarIcon fontSize="small" />}
                  label={`${t('sharedDevice')}: ${groupedItems.length}`}
                />
                <Chip
                  size="small"
                  color="warning"
                  variant="outlined"
                  icon={<WarningAmberIcon fontSize="small" />}
                  label={`${t('reportEvents')}: ${items.length}`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  icon={<SpeedIcon fontSize="small" />}
                  label={`${t('reportMaximumSpeed')}: ${formatSpeed(
                    groupedItems.reduce(
                      (acc, g) => Math.max(acc, g.maxSpeed),
                      0,
                    ),
                    speedUnit,
                    t,
                  )}`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  icon={<TimerIcon fontSize="small" />}
                  label={`${t('reportDuration')}: ${formatNumericHours(
                    groupedItems.reduce((acc, g) => acc + g.totalDuration, 0),
                    t,
                  )}`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  icon={<StraightenIcon fontSize="small" />}
                  label={`${t('sharedDistance')}: ${formatDistance(
                    groupedItems.reduce((acc, g) => acc + g.totalDistance, 0),
                    distanceUnit,
                    t,
                  )}`}
                />
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ExpandMoreIcon />}
                  onClick={() => setAllExpanded(true)}
                >
                  {t('sharedShowDetails')}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ExpandLessIcon />}
                  onClick={() => setAllExpanded(false)}
                >
                  {t('sharedHide')}
                </Button>
              </Stack>
            </Box>
          )}
          <Table>
            <TableHead>
              <TableRow>
                <TableCell className={classes.columnAction} />
                <TableCell
                  sortDirection={sortConfig?.key === 'deviceName' ? sortConfig.direction : false}
                >
                  <TableSortLabel
                    active={sortConfig?.key === 'deviceName'}
                    direction={sortConfig?.key === 'deviceName' ? sortConfig.direction || 'asc' : 'asc'}
                    onClick={() => handleSort('deviceName')}
                  >
                    {t('sharedDevice')}
                  </TableSortLabel>
                </TableCell>
                {columns.map((key) => (
                  <TableCell
                    key={key}
                    sortDirection={sortConfig?.key === key ? sortConfig.direction : false}
                  >
                    <TableSortLabel
                      active={sortConfig?.key === key}
                      direction={sortConfig?.key === key ? sortConfig.direction || 'asc' : 'asc'}
                      onClick={() => handleSort(key)}
                    >
                      {t(columnsMap.get(key))}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading ? (
                groupedItems.flatMap((group) => {
                  const expanded = isGroupExpanded(group.deviceId);
                  const headerRow = (
                    <TableRow
                      key={`group-${group.deviceId}`}
                      hover
                      onClick={() => toggleGroup(group.deviceId)}
                      sx={{
                        cursor: 'pointer',
                        backgroundColor: 'action.hover',
                        '& td': { borderBottom: '2px solid', borderColor: 'divider' },
                      }}
                    >
                      <TableCell padding="none" sx={{ width: 40 }}>
                        <Tooltip title={expanded ? t('sharedHide') : t('sharedShowDetails')}>
                          <IconButton
                            size="small"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleGroup(group.deviceId);
                            }}
                          >
                            {expanded ? (
                              <ExpandLessIcon fontSize="small" />
                            ) : (
                              <ExpandMoreIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                      <TableCell colSpan={columns.length + 1}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 1,
                          }}
                        >
                          <Stack direction="row" spacing={1} alignItems="center">
                            <DirectionsCarIcon fontSize="small" color="primary" />
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              {group.deviceName}
                            </Typography>
                          </Stack>
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            <Chip
                              size="small"
                              color="warning"
                              variant="outlined"
                              icon={<WarningAmberIcon fontSize="small" />}
                              label={`${t('reportEvents')}: ${group.items.length}`}
                            />
                            <Chip
                              size="small"
                              variant="outlined"
                              icon={<SpeedIcon fontSize="small" />}
                              label={`${t('reportMaximumSpeed')}: ${formatSpeed(
                                group.maxSpeed,
                                speedUnit,
                                t,
                              )}`}
                            />
                            <Chip
                              size="small"
                              variant="outlined"
                              icon={<TimerIcon fontSize="small" />}
                              label={`${t('reportDuration')}: ${formatNumericHours(
                                group.totalDuration,
                                t,
                              )}`}
                            />
                            <Chip
                              size="small"
                              variant="outlined"
                              icon={<StraightenIcon fontSize="small" />}
                              label={`${t('sharedDistance')}: ${formatDistance(
                                group.totalDistance,
                                distanceUnit,
                                t,
                              )}`}
                            />
                          </Stack>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                  if (!expanded) {
                    return [headerRow];
                  }
                  return [
                    headerRow,
                    ...group.items.map((item) => (
                      <TableRow
                        key={item.startPositionId}
                        sx={{
                          backgroundColor: item.maxSpeed > 62.095
                            ? 'rgba(244, 67, 54, 0.51)'
                            : item.maxSpeed > 59.395
                              ? 'rgba(255, 153, 0, 0.27)'
                              : 'inherit',
                          '& td': {
                            fontWeight: item.maxSpeed > 59.395 ? 600 : 400,
                          },
                        }}
                      >
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
                            <IconButton
                              size="small"
                              component="a"
                              href={`/replay?${new URLSearchParams({
                                from: item.startTime,
                                to: item.endTime,
                                deviceId: item.deviceId,
                              }).toString()}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <RouteIcon fontSize="small" />
                            </IconButton>
                          </div>
                        </TableCell>
                        <TableCell>{devices[item.deviceId]?.name || t('sharedUnknown')}</TableCell>
                        {columns.map((key) => (
                          <TableCell key={key}>{formatValue(item, key)}</TableCell>
                        ))}
                      </TableRow>
                    )),
                  ];
                })
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

export default OverSpeedReportPage;
