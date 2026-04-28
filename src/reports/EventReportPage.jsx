import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  Link,
  MenuItem,
  Select,
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
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { useSelector } from 'react-redux';
import { useTheme } from '@mui/material/styles';
import { formatAddress, formatSpeed, formatTime } from '../common/util/formatter';
import ReportFilter, { updateReportParams } from './components/ReportFilter';
import { prefixString, unprefixString } from '../common/util/stringUtils';
import { useTranslation, useTranslationKeys } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';
import usePersistedState from '../common/util/usePersistedState';
import ColumnSelect from './components/ColumnSelect';
import { useCatch, useEffectAsync } from '../reactHelper';
import useReportStyles from './common/useReportStyles';
import TableShimmer from '../common/components/TableShimmer';
import { useAttributePreference, usePreference } from '../common/util/preferences';
import MapView from '../map/core/MapView';
import MapGeofence from '../map/MapGeofence';
import MapPositions from '../map/MapPositions';
import MapCamera from '../map/MapCamera';
import scheduleReport from './common/scheduleReport';
import MapScale from '../map/MapScale';
import SelectField from '../common/components/SelectField';
import fetchOrThrow from '../common/util/fetchOrThrow';
import exportExcel from '../common/util/exportExcel';
import AddressValue from '../common/components/AddressValue';
import { deviceEquality } from '../common/util/deviceEquality';
import useReportSort, { compareValues, sortItems } from './common/useReportSort';
import SortableTableCell from './common/SortableTableCell';

const columnsArray = [
  ['eventTime', 'positionFixTime'],
  ['type', 'sharedType'],
  ['geofenceId', 'sharedGeofence'],
  ['maintenanceId', 'sharedMaintenance'],
  ['address', 'positionAddress'],
  ['attributes', 'commandData'],
];
const columnsMap = new Map(columnsArray);

const EventReportPage = () => {
  const navigate = useNavigate();
  const { classes } = useReportStyles();
  const t = useTranslation();
  const theme = useTheme();

  const [searchParams, setSearchParams] = useSearchParams();

  const devices = useSelector(
    (state) => state.devices.items,
    deviceEquality(['id', 'name', 'uniqueId']),
  );
  const geofences = useSelector((state) => state.geofences.items);

  const speedUnit = useAttributePreference('speedUnit');
  const coordinateFormat = usePreference('coordinateFormat');

  const [allEventTypes, setAllEventTypes] = useState([['allEvents', 'eventAll']]);

  const alarms = useTranslationKeys((it) => it.startsWith('alarm')).map((it) => ({
    key: unprefixString('alarm', it),
    name: t(it),
  }));

  const [columns, setColumns] = usePersistedState('eventColumns', [
    'eventTime',
    'type',
    'address',
    'attributes',
  ]);
  const eventTypes = useMemo(() => searchParams.getAll('eventType'), [searchParams]);
  const alarmTypes = useMemo(() => searchParams.getAll('alarmType'), [searchParams]);
  const [items, setItems] = useState([]);
  const [positions, setPositions] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [position, setPosition] = useState(null);
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
      case 'eventTime':
        return new Date(item.eventTime || 0).getTime();
      case 'type':
        return t(prefixString('event', item.type)) || '';
      case 'geofenceId':
        return geofences[item.geofenceId]?.name || '';
      case 'maintenanceId':
        return Number(item.maintenanceId) || 0;
      default:
        return item[key] ?? '';
    }
  };

  useEffect(() => {
    if (!eventTypes.length) {
      updateReportParams(searchParams, setSearchParams, 'eventType', ['allEvents']);
    }
  }, [searchParams, setSearchParams, eventTypes]);

  useEffect(() => {
    if (selectedItem?.positionId) {
      setPosition(positions[selectedItem.positionId] || null);
    } else {
      setPosition(null);
    }
  }, [selectedItem, positions]);

  useEffectAsync(async () => {
    const response = await fetchOrThrow('/api/notifications/types');
    const types = await response.json();
    setAllEventTypes([
      ...allEventTypes,
      ...types.map((it) => [it.type, prefixString('event', it.type)]),
    ]);
  }, []);

  const onShow = useCatch(async ({ deviceIds, groupIds, from, to }) => {
    const query = new URLSearchParams({ from, to });
    deviceIds.forEach((deviceId) => query.append('deviceId', deviceId));
    groupIds.forEach((groupId) => query.append('groupId', groupId));
    eventTypes.forEach((it) => query.append('type', it));
    if (eventTypes[0] !== 'allEvents' && eventTypes.includes('alarm')) {
      alarmTypes.forEach((it) => query.append('alarm', it));
    }
    setSelectedItem(null);
    setPosition(null);
    setExpandedGroups({});
    setLoading(true);
    try {
      const response = await fetchOrThrow(`/api/reports/events?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      const events = await response.json();
      setItems(events);
      const positionIds = Array.from(
        new Set(events.map((event) => event.positionId).filter((id) => id)),
      );
      const positionsMap = {};
      if (positionIds.length > 0) {
        const positionsQuery = new URLSearchParams();
        positionIds.slice(0, 128).forEach((id) => positionsQuery.append('id', id));
        const positionsResponse = await fetchOrThrow(`/api/positions?${positionsQuery.toString()}`);
        const positionsArray = await positionsResponse.json();
        positionsArray.forEach((p) => (positionsMap[p.id] = p));
      }
      setPositions(positionsMap);
    } finally {
      setLoading(false);
    }
  });

  const formatValue = (item, key) => {
    const value = item[key];
    switch (key) {
      case 'deviceId':
        return devices[value]?.name;
      case 'eventTime':
        return formatTime(value, 'seconds');
      case 'type':
        return t(prefixString('event', value));
      case 'geofenceId':
        if (value > 0) {
          const geofence = geofences[value];
          return geofence && geofence.name;
        }
        return null;
      case 'maintenanceId':
        return value > 0 ? value : null;
      case 'address': {
        const eventPosition = positions[item.positionId];
        if (eventPosition) {
          return (
            <AddressValue
              latitude={eventPosition.latitude}
              longitude={eventPosition.longitude}
              originalAddress={eventPosition.address}
            />
          );
        }
        return '';
      }
      case 'attributes':
        switch (item.type) {
          case 'alarm':
            return t(prefixString('alarm', item.attributes.alarm));
          case 'deviceOverspeed':
            return formatSpeed(item.attributes.speed, speedUnit, t);
          case 'driverChanged':
            return item.attributes.driverUniqueId;
          case 'media':
            return (
              <Link
                href={`/api/media/${devices[item.deviceId]?.uniqueId}/${item.attributes.file}`}
                target="_blank"
              >
                {item.attributes.file}
              </Link>
            );
          case 'commandResult':
            return item.attributes.result;
          default:
            return '';
        }
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
          alarms: 0,
        });
      }
      const group = groupMap.get(id);
      group.items.push(item);
      if (item.type === 'alarm') {
        group.alarms += 1;
      }
    });

    const groups = Array.from(groupMap.values());

    const itemSortKey =
      sortConfig?.key && sortConfig.key !== 'deviceName' ? sortConfig.key : 'eventTime';
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
  }, [items, devices, geofences, t, sortConfig]);

  const onExport = useCatch(async () => {
    const sheets = new Map();
    groupedItems.forEach((group) => {
      sheets.set(group.deviceName, []);
      group.items.forEach((item) => {
        const row = {};
        columns.forEach((key) => {
          const header = t(columnsMap.get(key));
          if (key === 'attributes' && item.type === 'media') {
            row[header] = item.attributes.file;
          } else if (key === 'address') {
            const exportPosition = positions[item.positionId];
            row[header] = exportPosition ? formatAddress(exportPosition, coordinateFormat) : '';
          } else {
            row[header] = formatValue(item, key);
          }
        });
        sheets.get(group.deviceName).push(row);
      });
    });
    await exportExcel(t('reportEvents'), 'events.xlsx', sheets, theme);
  });

  const onSchedule = useCatch(async (deviceIds, groupIds, report) => {
    report.type = 'events';
    if (eventTypes[0] !== 'allEvents') {
      report.attributes.types = eventTypes.join(',');
    }
    await scheduleReport(deviceIds, groupIds, report);
    navigate('/reports/scheduled');
  });

  return (
    <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'reportEvents']}>
      <div className={classes.container}>
        {selectedItem && (
          <div className={classes.containerMap}>
            <MapView>
              <MapGeofence />
              {position && <MapPositions positions={[position]} titleField="fixTime" />}
            </MapView>
            <MapScale />
            {position && <MapCamera latitude={position.latitude} longitude={position.longitude} />}
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
              <div className={classes.filterItem}>
                <FormControl fullWidth>
                  <InputLabel>{t('reportEventTypes')}</InputLabel>
                  <Select
                    label={t('reportEventTypes')}
                    value={eventTypes}
                    onChange={(e, child) => {
                      let values = e.target.value;
                      const clicked = child.props.value;
                      if (values.includes('allEvents') && values.length > 1) {
                        values = [clicked];
                      }
                      updateReportParams(searchParams, setSearchParams, 'eventType', values);
                    }}
                    multiple
                  >
                    {allEventTypes.map(([key, string]) => (
                      <MenuItem key={key} value={key}>
                        {t(string)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
              {eventTypes[0] !== 'allEvents' && eventTypes.includes('alarm') && (
                <div className={classes.filterItem}>
                  <SelectField
                    multiple
                    singleLine
                    value={alarmTypes}
                    onChange={(e) =>
                      updateReportParams(searchParams, setSearchParams, 'alarmType', e.target.value)
                    }
                    data={alarms}
                    keyGetter={(it) => it.key}
                    label={t('sharedAlarms')}
                    fullWidth
                  />
                </div>
              )}
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
                  icon={<NotificationsActiveIcon fontSize="small" />}
                  label={`${t('reportEvents')}: ${items.length}`}
                />
                <Chip
                  size="small"
                  color="warning"
                  variant="outlined"
                  icon={<NotificationsActiveIcon fontSize="small" />}
                  label={`${t('sharedAlarms')}: ${groupedItems.reduce((acc, g) => acc + g.alarms, 0)}`}
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
                              icon={<NotificationsActiveIcon fontSize="small" />}
                              label={`${t('reportEvents')}: ${group.items.length}`}
                            />
                            {group.alarms > 0 && (
                              <Chip
                                size="small"
                                color="warning"
                                variant="outlined"
                                icon={<NotificationsActiveIcon fontSize="small" />}
                                label={`${t('sharedAlarms')}: ${group.alarms}`}
                              />
                            )}
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
                      <TableRow key={item.id}>
                        <TableCell className={classes.columnAction} padding="none">
                          {(item.positionId &&
                            (selectedItem === item ? (
                              <IconButton size="small" onClick={() => setSelectedItem(null)}>
                                <GpsFixedIcon fontSize="small" />
                              </IconButton>
                            ) : (
                              <IconButton size="small" onClick={() => setSelectedItem(item)}>
                                <LocationSearchingIcon fontSize="small" />
                              </IconButton>
                            ))) ||
                            ''}
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
                <TableShimmer columns={columns.length + 2} />
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </PageLayout>
  );
};

export default EventReportPage;
