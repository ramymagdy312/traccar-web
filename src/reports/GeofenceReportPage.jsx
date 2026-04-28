import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
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
import RoomIcon from '@mui/icons-material/Room';
import TimerIcon from '@mui/icons-material/Timer';
import { formatNumericHours, formatTime } from '../common/util/formatter';
import ReportFilter, { updateReportParams } from './components/ReportFilter';
import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';
import ColumnSelect from './components/ColumnSelect';
import usePersistedState from '../common/util/usePersistedState';
import { useCatch } from '../reactHelper';
import useReportStyles from './common/useReportStyles';
import TableShimmer from '../common/components/TableShimmer';
import fetchOrThrow from '../common/util/fetchOrThrow';
import SelectField from '../common/components/SelectField';
import { deviceEquality } from '../common/util/deviceEquality';
import useReportSort, { compareValues, sortItems } from './common/useReportSort';
import SortableTableCell from './common/SortableTableCell';

const columnsArray = [
  ['geofenceId', 'sharedGeofence'],
  ['startTime', 'reportStartTime'],
  ['endTime', 'reportEndTime'],
  ['duration', 'reportDuration'],
];
const columnsMap = new Map(columnsArray);

const GeofenceReportPage = () => {
  const { classes } = useReportStyles();
  const t = useTranslation();

  const [searchParams, setSearchParams] = useSearchParams();
  const geofenceIds = useMemo(() => searchParams.getAll('geofenceId').map(Number), [searchParams]);

  const devices = useSelector((state) => state.devices.items, deviceEquality(['id', 'name']));
  const geofences = useSelector((state) => state.geofences.items);

  const [columns, setColumns] = usePersistedState('geofenceColumns', [
    'geofenceId',
    'startTime',
    'endTime',
  ]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
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

  const computeDuration = (item) => Date.parse(item.endTime) - Date.parse(item.startTime);

  const getSortValue = (item, key) => {
    switch (key) {
      case 'deviceName':
        return devices[item.deviceId]?.name || '';
      case 'geofenceId':
        return geofences[item.geofenceId]?.name || '';
      case 'startTime':
      case 'endTime':
        return new Date(item[key] || 0).getTime();
      case 'duration':
        return computeDuration(item);
      default:
        return item[key] ?? '';
    }
  };

  const onShow = useCatch(async ({ deviceIds, groupIds, from, to }) => {
    const query = new URLSearchParams({ from, to });
    deviceIds.forEach((deviceId) => query.append('deviceId', deviceId));
    groupIds.forEach((groupId) => query.append('groupId', groupId));
    geofenceIds.forEach((geofenceId) => query.append('geofenceId', geofenceId));
    setLoading(true);
    setExpandedGroups({});
    try {
      const response = await fetchOrThrow(`/api/reports/geofences?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      setItems(await response.json());
    } finally {
      setLoading(false);
    }
  });

  const formatValue = (item, key) => {
    switch (key) {
      case 'geofenceId':
        return geofences[item.geofenceId]?.name || item.geofenceId;
      case 'startTime':
      case 'endTime':
        return formatTime(item[key], 'minutes');
      case 'duration':
        return formatNumericHours(computeDuration(item), t);
      default:
        return item[key];
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
        });
      }
      const group = groupMap.get(id);
      group.items.push(item);
      group.totalDuration += computeDuration(item);
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
  }, [items, devices, geofences, t, sortConfig]);

  return (
    <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'sharedGeofences']}>
      <div className={classes.header}>
        <ReportFilter onShow={onShow} deviceType="multiple" loading={loading}>
          <div className={classes.filterItem}>
            <SelectField
              label={t('sharedGeofences')}
              value={geofenceIds}
              onChange={(e) =>
                updateReportParams(searchParams, setSearchParams, 'geofenceId', e.target.value)
              }
              endpoint="/api/geofences"
              multiple
              singleLine
              fullWidth
            />
          </div>
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
              icon={<RoomIcon fontSize="small" />}
              label={`${t('sharedGeofences')}: ${items.length}`}
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
            <TableCell sx={{ width: 40 }} />
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
                          icon={<RoomIcon fontSize="small" />}
                          label={`${t('sharedGeofences')}: ${group.items.length}`}
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
                    key={`${item.deviceId}_${item.geofenceId}_${item.startTime}_${item.endTime}`}
                  >
                    <TableCell />
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
    </PageLayout>
  );
};

export default GeofenceReportPage;
