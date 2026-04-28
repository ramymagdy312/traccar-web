import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
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
  Tooltip,
  Typography,
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
import scheduleReport from './common/scheduleReport';
import MapScale from '../map/MapScale';
import fetchOrThrow from '../common/util/fetchOrThrow';
import exportExcel from '../common/util/exportExcel';
import { deviceEquality } from '../common/util/deviceEquality';
import useReportSort, { compareValues, sortItems } from './common/useReportSort';
import SortableTableCell from './common/SortableTableCell';

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
  const [expandedGroups, setExpandedGroups] = useState({});
  const { sortConfig, handleSort } = useReportSort();

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

  const getSortValue = (item, key) => {
    switch (key) {
      case 'deviceName':
        return devices[item.deviceId]?.name || '';
      case 'startTime':
      case 'endTime':
        return new Date(item[key] || 0).getTime();
      case 'startOdometer':
      case 'endOdometer':
      case 'distance':
      case 'averageSpeed':
      case 'maxSpeed':
      case 'duration':
      case 'spentFuel':
        return Number(item[key]) || 0;
      default:
        return item[key] ?? '';
    }
  };

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

  const onShow = useCatch(async ({ deviceIds, groupIds, from, to }) => {
    const query = new URLSearchParams({ from, to });
    deviceIds.forEach((deviceId) => query.append('deviceId', deviceId));
    groupIds.forEach((groupId) => query.append('groupId', groupId));
    setLoading(true);
    setSelectedItem(null);
    setRoute(null);
    setExpandedGroups({});
    try {
      const response = await fetchOrThrow(`/api/reports/trips?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      setItems(await response.json());
    } finally {
      setLoading(false);
    }
  });

  const formatValue = (item, key) => {
    const value = item[key];
    switch (key) {
      case 'deviceId':
        return devices[value]?.name;
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

  const groupedItems = useMemo(() => {
    const groupMap = new Map();
    items.forEach((item) => {
      const id = item.deviceId;
      if (!groupMap.has(id)) {
        groupMap.set(id, {
          deviceId: id,
          deviceName: devices[id]?.name || t('deviceStatusUnknown'),
          items: [],
          maxSpeed: 0,
          totalDuration: 0,
          totalDistance: 0,
          totalSpentFuel: 0,
        });
      }
      const group = groupMap.get(id);
      group.items.push(item);
      group.maxSpeed = Math.max(group.maxSpeed, item.maxSpeed || 0);
      group.totalDuration += item.duration || 0;
      group.totalDistance += item.distance || 0;
      group.totalSpentFuel += item.spentFuel || 0;
    });

    const groups = Array.from(groupMap.values());

    const itemSortKey =
      sortConfig?.key && sortConfig.key !== 'deviceName' ? sortConfig.key : 'startTime';
    const itemSortDirection =
      sortConfig?.key && sortConfig.key !== 'deviceName' ? sortConfig.direction : 'asc';
    groups.forEach((group) => {
      group.items = sortItems(group.items, itemSortKey, itemSortDirection || 'asc', getSortValue);
    });

    const groupSortDirection =
      sortConfig?.key === 'deviceName' && sortConfig.direction ? sortConfig.direction : 'asc';
    const groupDir = groupSortDirection === 'desc' ? -1 : 1;
    groups.sort((a, b) => compareValues(a.deviceName, b.deviceName) * groupDir);

    return groups;
  }, [items, devices, t, sortConfig]);

  const onExport = useCatch(async () => {
    const sheets = new Map();
    groupedItems.forEach((group) => {
      sheets.set(group.deviceName, []);
      group.items.forEach((item) => {
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
        sheets.get(group.deviceName).push(row);
      });
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

  return (
    <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'reportTrips']}>
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
              <ColumnSelect columns={columns} setColumns={setColumns} columnsArray={columnsArray} />
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
                  variant="outlined"
                  icon={<RouteIcon fontSize="small" />}
                  label={`${t('reportTrips')}: ${items.length}`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  icon={<SpeedIcon fontSize="small" />}
                  label={`${t('reportMaximumSpeed')}: ${formatSpeed(
                    groupedItems.reduce((acc, g) => Math.max(acc, g.maxSpeed), 0),
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
                <SortableTableCell sortKey="deviceName" sortConfig={sortConfig} onSort={handleSort}>
                  {t('sharedDevice')}
                </SortableTableCell>
                {columns.map((key) => (
                  <SortableTableCell
                    key={key}
                    sortKey={key}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  >
                    {t(columnsMap.get(key))}
                  </SortableTableCell>
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
                              variant="outlined"
                              icon={<RouteIcon fontSize="small" />}
                              label={`${t('reportTrips')}: ${group.items.length}`}
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
                        <TableCell>
                          {devices[item.deviceId]?.name || t('deviceStatusUnknown')}
                        </TableCell>
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

export default TripReportPage;
