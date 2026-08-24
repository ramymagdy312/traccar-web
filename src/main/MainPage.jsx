import { useState, useCallback, useEffect } from 'react';
import { Paper } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useDispatch, useSelector } from 'react-redux';
import Dashboard from './Dashboard';
import BottomMenu from '../common/components/BottomMenu';
import StatusCard from '../common/components/StatusCard';
import GoToRouteBar from '../common/components/GoToRouteBar';
import { devicesActions } from '../store';
import EventsDrawer from './EventsDrawer';
import MainToolbar from './MainToolbar';
import MainMap from './MainMap';
import { useAttributePreference } from '../common/util/preferences';
import { useCatchCallback } from '../reactHelper';
import { useTranslation } from '../common/components/LocalizationProvider';
import { fetchGoToRoute } from '../common/util/routing';

const useStyles = makeStyles()((theme) => ({
  root: {
    height: '100%',
  },
  sidebar: {
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    [theme.breakpoints.up('md')]: {
      position: 'fixed',
      left: 0,
      top: 0,
      height: `calc(100% - ${theme.spacing(3)})`,
      width: theme.dimensions.drawerWidthDesktop,
      margin: theme.spacing(1.5),
      zIndex: 3,
    },
    [theme.breakpoints.down('md')]: {
      height: '100%',
      width: '100%',
    },
  },
  header: {
    pointerEvents: 'auto',
    zIndex: 6,
    [theme.breakpoints.up('md')]: {
      borderRadius: '12px 12px 0 0',
      overflow: 'hidden',
    },
  },
  footer: {
    pointerEvents: 'auto',
    zIndex: 5,
    borderRadius: '0 0 12px 12px',
    overflow: 'hidden',
  },
  middle: {
    flex: 1,
    display: 'grid',
    minHeight: 0,
  },
  contentMap: {
    pointerEvents: 'auto',
    gridArea: '1 / 1',
  },
  contentList: {
    pointerEvents: 'auto',
    gridArea: '1 / 1',
    zIndex: 4,
    display: 'flex',
    minHeight: 0,
    width: '100%',
  },
}));

const MainPage = () => {
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const theme = useTheme();
  const t = useTranslation();

  const desktop = useMediaQuery(theme.breakpoints.up('md'));

  const mapOnSelect = useAttributePreference('mapOnSelect', true);

  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  const positions = useSelector((state) => state.session.positions);
  const [mapFilterIds, setMapFilterIds] = useState(null);
  const [goToRoute, setGoToRoute] = useState(null);
  const [goToLoading, setGoToLoading] = useState(false);

  const allPositions = Object.values(positions);
  const filteredPositions = selectedDeviceId
    ? allPositions.filter((p) => p.deviceId === selectedDeviceId)
    : mapFilterIds
      ? allPositions.filter((p) => mapFilterIds.has(p.deviceId))
      : allPositions;
  const selectedPosition = allPositions.find(
    (position) => selectedDeviceId && position.deviceId === selectedDeviceId,
  );

  const [devicesOpen, setDevicesOpen] = useState(desktop);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [statusMinimized, setStatusMinimized] = useState(false);

  const onEventsClick = useCallback(() => setEventsOpen(true), [setEventsOpen]);

  const handleGoTo = useCatchCallback(
    async (position) => {
      setGoToLoading(true);
      try {
        const route = await fetchGoToRoute({
          latitude: position.latitude,
          longitude: position.longitude,
        });
        setGoToRoute(route);
      } catch (error) {
        if (error.code === 'LOCATION_DENIED') {
          throw new Error(t('sharedLocationDenied'));
        }
        throw error;
      } finally {
        setGoToLoading(false);
      }
    },
    [t],
  );

  const handleCloseSelected = useCallback(() => {
    dispatch(devicesActions.selectId(null));
    setGoToRoute(null);
  }, [dispatch]);

  useEffect(() => {
    if (!desktop && mapOnSelect && selectedDeviceId) {
      setDevicesOpen(false);
    }
  }, [desktop, mapOnSelect, selectedDeviceId]);

  return (
    <div className={classes.root}>
      {desktop && (
        <MainMap
          filteredPositions={filteredPositions}
          selectedPosition={selectedPosition}
          onEventsClick={onEventsClick}
          goToRoute={goToRoute}
        />
      )}
      <div className={classes.sidebar}>
        <Paper square elevation={3} className={classes.header}>
          <MainToolbar devicesOpen={devicesOpen} setDevicesOpen={setDevicesOpen} />
        </Paper>
        <div className={classes.middle}>
          {!desktop && (
            <div className={classes.contentMap}>
              <MainMap
                filteredPositions={filteredPositions}
                selectedPosition={selectedPosition}
                onEventsClick={onEventsClick}
                goToRoute={goToRoute}
                statusCardMinimized={statusMinimized}
              />
            </div>
          )}
          <Paper
            square
            className={classes.contentList}
            style={devicesOpen ? {} : { visibility: 'hidden' }}
          >
            <Dashboard onFilterMap={setMapFilterIds} />
          </Paper>
        </div>
        {desktop && (
          <div className={classes.footer}>
            <BottomMenu />
          </div>
        )}
      </div>
      <EventsDrawer open={eventsOpen} onClose={() => setEventsOpen(false)} />
      {goToRoute && (
        <GoToRouteBar
          distanceMeters={goToRoute.distanceMeters}
          durationSeconds={goToRoute.durationSeconds}
          onClose={() => setGoToRoute(null)}
          desktopPadding={theme.dimensions.drawerWidthDesktop}
        />
      )}
      {selectedDeviceId && (desktop || !devicesOpen) && (
        <StatusCard
          deviceId={selectedDeviceId}
          position={selectedPosition}
          onClose={handleCloseSelected}
          desktopPadding={theme.dimensions.drawerWidthDesktop}
          onGoTo={handleGoTo}
          goToLoading={goToLoading}
          onMinimizedChange={setStatusMinimized}
        />
      )}
    </div>
  );
};

export default MainPage;
