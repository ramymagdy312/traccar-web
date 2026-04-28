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
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import TimerIcon from '@mui/icons-material/Timer';
import {
  formatAddress,
  formatDistance,
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
import { useCatch } from '../reactHelper';
import useReportStyles from './common/useReportStyles';
import MapPositions from '../map/MapPositions';
import MapView from '../map/core/MapView';
import MapCamera from '../map/MapCamera';
import AddressValue from '../common/components/AddressValue';
import TableShimmer from '../common/components/TableShimmer';
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
  ['startOdometer', 'positionOdometer'],
  ['address', 'positionAddress'],
  ['endTime', 'reportEndTime'],
  ['duration', 'reportDuration'],
  ['engineHours', 'reportEngineHours'],
  ['spentFuel', 'reportSpentFuel'],
];
const columnsMap = new Map(columnsArray);

const StopReportPage = () => {
  const navigate = useNavigate();
  const { classes } = useReportStyles();
  const t = useTranslation();
  const theme = useTheme();

  const devices = useSelector((state) => state.devices.items, deviceEquality(['id', 'name']));

  const distanceUnit = useAttributePreference('distanceUnit');
  const volumeUnit = useAttributePreference('volumeUnit');
  const coordinateFormat = usePreference('coordinateFormat');

  const [columns, setColumns] = usePersistedState('stopColumns', [
    'startTime',
    'endTime',
    'startOdometer',
    'address',
  ]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
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
      case 'duration':
      case 'engineHours':
      case 'spentFuel':
        return Number(item[key]) || 0;
      default:
        return item[key] ?? '';
    }
  };

  const onShow = useCatch(async ({ deviceIds, groupIds, from, to }) => {
    const query = new URLSearchParams({ from, to });
    deviceIds.forEach((deviceId) => query.append('deviceId', deviceId));
    groupIds.forEach((groupId) => query.append('groupId', groupId));
    setLoading(true);
    setSelectedItem(null);
    setExpandedGroups({});
    try {
      const response = await fetchOrThrow(`/api/reports/stops?${query.toString()}`, {
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
        return formatDistance(value, distanceUnit, t);
      case 'duration':
        return formatNumericHours(value, t);
      case 'engineHours':
        return value > 0 ? formatNumericHours(value, t) : null;
      case 'spentFuel':
        return value > 0 ? formatVolume(value, volumeUnit, t) : null;
      case 'address':
        return (
          <AddressValue
            latitude={item.latitude}
            longitude={item.longitude}
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
          deviceName: devices[id]?.name || t('deviceStatusUnknown'),
          items: [],
          totalDuration: 0,
          totalEngineHours: 0,
          totalSpentFuel: 0,
        });
      }
      const group = groupMap.get(id);
      group.items.push(item);
      group.totalDuration += item.duration || 0;
      group.totalEngineHours += item.engineHours || 0;
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
          if (key === 'address') {
            row[header] = formatAddress(item, coordinateFormat);
          } else {
            row[header] = formatValue(item, key);
          }
        });
        sheets.get(group.deviceName).push(row);
      });
    });
    await exportExcel(t('reportStops'), 'stops.xlsx', sheets, theme);
  });

  const onSchedule = useCatch(async (deviceIds, groupIds, report) => {
    report.type = 'stops';
    await scheduleReport(deviceIds, groupIds, report);
    navigate('/reports/scheduled');
  });

  return (
    <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'reportStops']}>
      <div className={classes.container}>
        {selectedItem && (
          <div className={classes.containerMap}>
            <MapView>
              <MapGeofence />
              <MapPositions
                positions={[
                  {
                    deviceId: selectedItem.deviceId,
                    fixTime: selectedItem.startTime,
                    latitude: selectedItem.latitude,
                    longitude: selectedItem.longitude,
                  },
                ]}
                titleField="fixTime"
              />
            </MapView>
            <MapScale />
            <MapCamera latitude={selectedItem.latitude} longitude={selectedItem.longitude} />
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
                  icon={<PauseCircleOutlineIcon fontSize="small" />}
                  label={`${t('reportStops')}: ${items.length}`}
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
                  icon={<LocalGasStationIcon fontSize="small" />}
                  label={`${t('reportSpentFuel')}: ${formatVolume(
                    groupedItems.reduce((acc, g) => acc + g.totalSpentFuel, 0),
                    volumeUnit,
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
                              icon={<PauseCircleOutlineIcon fontSize="small" />}
                              label={`${t('reportStops')}: ${group.items.length}`}
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
                              icon={<LocalGasStationIcon fontSize="small" />}
                              label={`${t('reportSpentFuel')}: ${formatVolume(
                                group.totalSpentFuel,
                                volumeUnit,
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
                      <TableRow key={item.positionId}>
                        <TableCell className={classes.columnAction} padding="none">
                          {selectedItem === item ? (
                            <IconButton size="small" onClick={() => setSelectedItem(null)}>
                              <GpsFixedIcon fontSize="small" />
                            </IconButton>
                          ) : (
                            <IconButton size="small" onClick={() => setSelectedItem(item)}>
                              <LocationSearchingIcon fontSize="small" />
                            </IconButton>
                          )}
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

export default StopReportPage;
