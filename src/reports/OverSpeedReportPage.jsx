import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from '@mui/material';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import LocationSearchingIcon from '@mui/icons-material/LocationSearching';
import RouteIcon from '@mui/icons-material/Route';

import {
  formatDistance,
  formatSpeed,
  formatTime,
  formatNumericHours,
} from '../common/util/formatter';

import ReportFilter from './components/ReportFilter';
import { useAttributePreference } from '../common/util/preferences';
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
  { label: '120 km/h', value: 64.795 },
];

const OverSpeedReportPage = () => {
  const navigate = useNavigate();
  const { classes } = useReportStyles();
  const t = useTranslation();

  const distanceUnit = useAttributePreference('distanceUnit');
  const speedUnit = useAttributePreference('speedUnit');

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
    window.location.assign(`/api/reports/overSpeed/xlsx?${query.toString()}`);
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
          <Table>
            <TableHead>
              <TableRow>
                <TableCell className={classes.columnAction} />
                <TableCell>{t('sharedDevice')}</TableCell>
                {columns.map((key) => (
                  <TableCell key={key}>{t(columnsMap.get(key))}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading ? (
                items.map((item) => (
                  <TableRow key={item.startPositionId} 
                  sx={{backgroundColor: item.maxSpeed > 64.795? 
                    'rgba(244, 67, 54, 0.12)' : item.maxSpeed > 59.395? 
                    'rgba(255, 152, 0, 0.12)' : 'inherit', '& td': {
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
                        <IconButton size="small" onClick={() => navigateToReplay(item)}>
                          <RouteIcon fontSize="small" />
                        </IconButton>
                      </div>
                    </TableCell>
                    <TableCell>{devices[item.deviceId].name}</TableCell>
                    {columns.map((key) => (
                      <TableCell key={key}>{formatValue(item, key)}</TableCell>
                    ))}
                  </TableRow>
                ))
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
