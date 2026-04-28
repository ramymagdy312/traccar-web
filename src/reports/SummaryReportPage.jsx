import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
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
import { useTheme } from '@mui/material/styles';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SpeedIcon from '@mui/icons-material/Speed';
import StraightenIcon from '@mui/icons-material/Straighten';
import TimerIcon from '@mui/icons-material/Timer';
import {
  formatDistance,
  formatSpeed,
  formatVolume,
  formatTime,
  formatNumericHours,
} from '../common/util/formatter';
import ReportFilter, { updateReportParams } from './components/ReportFilter';
import { useAttributePreference } from '../common/util/preferences';
import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';
import usePersistedState from '../common/util/usePersistedState';
import ColumnSelect from './components/ColumnSelect';
import { useCatch } from '../reactHelper';
import useReportStyles from './common/useReportStyles';
import TableShimmer from '../common/components/TableShimmer';
import scheduleReport from './common/scheduleReport';
import fetchOrThrow from '../common/util/fetchOrThrow';
import exportExcel from '../common/util/exportExcel';
import { deviceEquality } from '../common/util/deviceEquality';
import useReportSort, { compareValues, sortItems } from './common/useReportSort';
import SortableTableCell from './common/SortableTableCell';

const columnsArray = [
  ['startTime', 'reportStartDate'],
  ['distance', 'sharedDistance'],
  ['startOdometer', 'reportStartOdometer'],
  ['endOdometer', 'reportEndOdometer'],
  ['averageSpeed', 'reportAverageSpeed'],
  ['maxSpeed', 'reportMaximumSpeed'],
  ['engineHours', 'reportEngineHours'],
  ['startHours', 'reportStartEngineHours'],
  ['endHours', 'reportEndEngineHours'],
  ['spentFuel', 'reportSpentFuel'],
];
const columnsMap = new Map(columnsArray);

const SummaryReportPage = () => {
  const navigate = useNavigate();
  const { classes } = useReportStyles();
  const t = useTranslation();
  const theme = useTheme();

  const [searchParams, setSearchParams] = useSearchParams();

  const devices = useSelector((state) => state.devices.items, deviceEquality(['id', 'name']));

  const distanceUnit = useAttributePreference('distanceUnit');
  const speedUnit = useAttributePreference('speedUnit');
  const volumeUnit = useAttributePreference('volumeUnit');

  const [columns, setColumns] = usePersistedState('summaryColumns', [
    'startTime',
    'distance',
    'averageSpeed',
  ]);
  const daily = searchParams.get('daily') === 'true';
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

  const getSortValue = (item, key) => {
    switch (key) {
      case 'deviceName':
        return devices[item.deviceId]?.name || '';
      case 'startTime':
        return new Date(item.startTime || 0).getTime();
      case 'distance':
      case 'startOdometer':
      case 'endOdometer':
      case 'averageSpeed':
      case 'maxSpeed':
      case 'engineHours':
      case 'startHours':
      case 'endHours':
      case 'spentFuel':
        return Number(item[key]) || 0;
      default:
        return item[key] ?? '';
    }
  };

  const onShow = useCatch(async ({ deviceIds, groupIds, from, to }) => {
    const query = new URLSearchParams({ from, to, daily });
    deviceIds.forEach((deviceId) => query.append('deviceId', deviceId));
    groupIds.forEach((groupId) => query.append('groupId', groupId));
    setLoading(true);
    setExpandedGroups({});
    try {
      const response = await fetchOrThrow(`/api/reports/summary?${query.toString()}`, {
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
        return formatTime(value, 'date');
      case 'startOdometer':
      case 'endOdometer':
      case 'distance':
        return formatDistance(value, distanceUnit, t);
      case 'averageSpeed':
      case 'maxSpeed':
        return value > 0 ? formatSpeed(value, speedUnit, t) : null;
      case 'engineHours':
      case 'startHours':
      case 'endHours':
        return value > 0 ? formatNumericHours(value, t) : null;
      case 'spentFuel':
        return value > 0 ? formatVolume(value, volumeUnit, t) : null;
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
          totalDistance: 0,
          totalEngineHours: 0,
          totalSpentFuel: 0,
          maxSpeed: 0,
        });
      }
      const group = groupMap.get(id);
      group.items.push(item);
      group.totalDistance += item.distance || 0;
      group.totalEngineHours += item.engineHours || 0;
      group.totalSpentFuel += item.spentFuel || 0;
      group.maxSpeed = Math.max(group.maxSpeed, item.maxSpeed || 0);
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
    const rows = [];
    const deviceHeader = t('sharedDevice');
    groupedItems.forEach((group) => {
      group.items.forEach((item) => {
        const row = { [deviceHeader]: group.deviceName };
        columns.forEach((key) => {
          const header = t(columnsMap.get(key));
          row[header] = formatValue(item, key);
        });
        rows.push(row);
      });
    });
    if (rows.length === 0) {
      return;
    }
    const titleKey = daily ? 'reportDaily' : 'reportSummary';
    const title = t(titleKey);
    const sheets = new Map([[title, rows]]);
    await exportExcel(title, 'summary.xlsx', sheets, theme);
  });

  const onSchedule = useCatch(async (deviceIds, groupIds, report) => {
    report.type = 'summary';
    report.attributes.daily = daily;
    await scheduleReport(deviceIds, groupIds, report);
    navigate('/reports/scheduled');
  });

  return (
    <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'reportSummary']}>
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
              <InputLabel>{t('sharedType')}</InputLabel>
              <Select
                label={t('sharedType')}
                value={daily}
                onChange={(e) =>
                  updateReportParams(searchParams, setSearchParams, 'daily', [
                    String(e.target.value),
                  ])
                }
              >
                <MenuItem value={false}>{t('reportSummary')}</MenuItem>
                <MenuItem value>{t('reportDaily')}</MenuItem>
              </Select>
            </FormControl>
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
              icon={<StraightenIcon fontSize="small" />}
              label={`${t('sharedDistance')}: ${formatDistance(
                groupedItems.reduce((acc, g) => acc + g.totalDistance, 0),
                distanceUnit,
                t,
              )}`}
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
              label={`${t('reportEngineHours')}: ${formatNumericHours(
                groupedItems.reduce((acc, g) => acc + g.totalEngineHours, 0),
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
                          icon={<StraightenIcon fontSize="small" />}
                          label={`${t('sharedDistance')}: ${formatDistance(
                            group.totalDistance,
                            distanceUnit,
                            t,
                          )}`}
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
                          label={`${t('reportEngineHours')}: ${formatNumericHours(
                            group.totalEngineHours,
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
                  <TableRow key={`${item.deviceId}_${Date.parse(item.startTime)}`}>
                    <TableCell />
                    <TableCell>{group.deviceName}</TableCell>
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

export default SummaryReportPage;
