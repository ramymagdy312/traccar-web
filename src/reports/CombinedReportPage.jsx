import { useMemo, useState } from 'react';
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
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import ReportFilter from './components/ReportFilter';
import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';
import { useCatch } from '../reactHelper';
import MapView from '../map/core/MapView';
import useReportStyles from './common/useReportStyles';
import TableShimmer from '../common/components/TableShimmer';
import MapCamera from '../map/MapCamera';
import MapGeofence from '../map/MapGeofence';
import { formatTime } from '../common/util/formatter';
import { prefixString } from '../common/util/stringUtils';
import MapMarkers from '../map/MapMarkers';
import MapRouteCoordinates from '../map/MapRouteCoordinates';
import MapScale from '../map/MapScale';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { deviceEquality } from '../common/util/deviceEquality';
import useReportSort, { compareValues, sortItems } from './common/useReportSort';
import SortableTableCell from './common/SortableTableCell';

const CombinedReportPage = () => {
  const { classes } = useReportStyles();
  const t = useTranslation();

  const devices = useSelector((state) => state.devices.items, deviceEquality(['id', 'name']));

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const { sortConfig, handleSort } = useReportSort();

  const itemsCoordinates = useMemo(() => items.flatMap((item) => item.route), [items]);

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

  const getEventSortValue = (event, key) => {
    switch (key) {
      case 'eventTime':
        return new Date(event.eventTime || 0).getTime();
      case 'type':
        return t(prefixString('event', event.type)) || '';
      default:
        return event[key] ?? '';
    }
  };

  const createMarkers = () =>
    items.flatMap((item) =>
      item.events
        .map((event) => item.positions.find((p) => event.positionId === p.id))
        .filter((position) => position != null)
        .map((position) => ({
          latitude: position.latitude,
          longitude: position.longitude,
        })),
    );

  const onShow = useCatch(async ({ deviceIds, groupIds, from, to }) => {
    const query = new URLSearchParams({ from, to });
    deviceIds.forEach((deviceId) => query.append('deviceId', deviceId));
    groupIds.forEach((groupId) => query.append('groupId', groupId));
    setLoading(true);
    setExpandedGroups({});
    try {
      const response = await fetchOrThrow(`/api/reports/combined?${query.toString()}`);
      setItems(await response.json());
    } finally {
      setLoading(false);
    }
  });

  const groupedItems = useMemo(() => {
    const groups = items.map((item) => ({
      deviceId: item.deviceId,
      deviceName: devices[item.deviceId]?.name || t('deviceStatusUnknown'),
      events: sortItems(
        item.events,
        sortConfig?.key && sortConfig.key !== 'deviceName' ? sortConfig.key : 'eventTime',
        (sortConfig?.key && sortConfig.key !== 'deviceName' && sortConfig?.direction) || 'asc',
        getEventSortValue,
      ),
    }));
    const groupSortDirection =
      sortConfig?.key === 'deviceName' && sortConfig.direction ? sortConfig.direction : 'asc';
    const groupDir = groupSortDirection === 'desc' ? -1 : 1;
    groups.sort((a, b) => compareValues(a.deviceName, b.deviceName) * groupDir);
    return groups;
  }, [items, devices, t, sortConfig]);

  const totalEvents = useMemo(
    () => groupedItems.reduce((acc, group) => acc + group.events.length, 0),
    [groupedItems],
  );

  return (
    <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'reportCombined']}>
      <div className={classes.container}>
        {Boolean(items.length) && (
          <div className={classes.containerMap}>
            <MapView>
              <MapGeofence />
              {items.map((item) => (
                <MapRouteCoordinates
                  key={item.deviceId}
                  name={devices[item.deviceId]?.name}
                  coordinates={item.route}
                  deviceId={item.deviceId}
                />
              ))}
              <MapMarkers markers={createMarkers()} />
            </MapView>
            <MapScale />
            <MapCamera coordinates={itemsCoordinates} />
          </div>
        )}
        <div className={classes.containerMain}>
          <div className={classes.header}>
            <ReportFilter onShow={onShow} deviceType="multiple" loading={loading} />
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
                  label={`${t('reportEvents')}: ${totalEvents}`}
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
                <SortableTableCell sortKey="eventTime" sortConfig={sortConfig} onSort={handleSort}>
                  {t('positionFixTime')}
                </SortableTableCell>
                <SortableTableCell sortKey="type" sortConfig={sortConfig} onSort={handleSort}>
                  {t('sharedType')}
                </SortableTableCell>
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
                      <TableCell colSpan={3}>
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
                          <Chip
                            size="small"
                            variant="outlined"
                            icon={<NotificationsActiveIcon fontSize="small" />}
                            label={`${t('reportEvents')}: ${group.events.length}`}
                          />
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                  if (!expanded) {
                    return [headerRow];
                  }
                  return [
                    headerRow,
                    ...group.events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell />
                        <TableCell>{group.deviceName}</TableCell>
                        <TableCell>{formatTime(event.eventTime, 'seconds')}</TableCell>
                        <TableCell>{t(prefixString('event', event.type))}</TableCell>
                      </TableRow>
                    )),
                  ];
                })
              ) : (
                <TableShimmer columns={4} />
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </PageLayout>
  );
};

export default CombinedReportPage;
