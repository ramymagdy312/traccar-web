import { Box, Divider, List, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { makeStyles } from 'tss-react/mui';
import StarIcon from '@mui/icons-material/Star';
import TimelineIcon from '@mui/icons-material/Timeline';
import PauseCircleFilledIcon from '@mui/icons-material/PauseCircleFilled';
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PlaceIcon from '@mui/icons-material/Place';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import BarChartIcon from '@mui/icons-material/BarChart';
import RouteIcon from '@mui/icons-material/Route';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import NotesIcon from '@mui/icons-material/Notes';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import SpeedIcon from '@mui/icons-material/Speed';
import { useLocation } from 'react-router-dom';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { useAdministrator, useRestriction } from '../../common/util/permissions';
import MenuItem from '../../common/components/MenuItem';

const useStyles = makeStyles()((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(1, 0.5, 2),
  },
  list: {
    paddingTop: 0,
    paddingBottom: theme.spacing(0.5),
  },
  section: {
    padding: theme.spacing(1.25, 2, 0.5),
    fontSize: '0.6875rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: theme.palette.text.secondary,
  },
  divider: {
    margin: theme.spacing(1, 2),
    borderColor: alpha(theme.palette.divider, 0.8),
  },
}));

const ReportsMenu = () => {
  const { classes } = useStyles();
  const t = useTranslation();
  const location = useLocation();

  const admin = useAdministrator();
  const readonly = useRestriction('readonly');

  const buildLink = (path) => {
    const sourceParams = new URLSearchParams(location.search);
    const deviceIds = sourceParams.getAll('deviceId');
    const groupIds = sourceParams.getAll('groupId');
    if (!deviceIds.length && !groupIds.length) {
      return path;
    }
    const params = new URLSearchParams();
    if (path === '/reports/chart' || path === '/reports/route' || path === '/replay') {
      const [firstDeviceId] = deviceIds;
      if (firstDeviceId != null) {
        params.append('deviceId', firstDeviceId);
      }
    } else {
      deviceIds.forEach((deviceId) => params.append('deviceId', deviceId));
      groupIds.forEach((groupId) => params.append('groupId', groupId));
    }
    const search = params.toString();
    return search ? `${path}?${search}` : path;
  };

  const sectionLabel = (key, fallback) => t(key) || fallback;

  const activityItems = [
    { title: t('reportCombined'), path: '/reports/combined', icon: <StarIcon />, color: '#f59e0b' },
    { title: t('reportEvents'), path: '/reports/events', icon: <NotificationsActiveIcon />, color: '#ef4444' },
    { title: t('sharedGeofences'), path: '/reports/geofences', icon: <PlaceIcon />, color: '#10b981' },
    { title: t('reportTrips'), path: '/reports/trips', icon: <PlayCircleFilledIcon />, color: '#3b82f6' },
    { title: t('reportStops'), path: '/reports/stops', icon: <PauseCircleFilledIcon />, color: '#8b5cf6' },
    { title: t('reportSpeedExcess'), path: '/reports/overspeed', icon: <SpeedIcon />, color: '#f43f5e' },
  ];

  const analysisItems = [
    { title: t('reportSummary'), path: '/reports/summary', icon: <FormatListBulletedIcon />, color: '#0ea5e9' },
    { title: t('reportChart'), path: '/reports/chart', icon: <TrendingUpIcon />, color: '#14b8a6' },
  ];

  const trackingItems = [
    { title: t('reportReplay'), path: '/replay', icon: <RouteIcon />, color: '#6366f1' },
    { title: t('reportPositions'), path: '/reports/route', icon: <TimelineIcon />, color: '#64748b' },
  ];

  const renderItems = (items) => items.map((item) => (
    <MenuItem
      key={item.path}
      title={item.title}
      link={buildLink(item.path)}
      icon={item.icon}
      color={item.color}
      selected={location.pathname === item.path}
    />
  ));

  return (
    <Box className={classes.root}>
      <Typography className={classes.section}>
        {sectionLabel('reportMenuActivity', 'Activity')}
      </Typography>
      <List className={classes.list} disablePadding>
        {renderItems(activityItems)}
      </List>

      <Typography className={classes.section}>
        {sectionLabel('reportMenuAnalysis', 'Analysis')}
      </Typography>
      <List className={classes.list} disablePadding>
        {renderItems(analysisItems)}
      </List>

      <Typography className={classes.section}>
        {sectionLabel('reportMenuTracking', 'Tracking')}
      </Typography>
      <List className={classes.list} disablePadding>
        {renderItems(trackingItems)}
      </List>

      <Divider className={classes.divider} />

      <Typography className={classes.section}>
        {sectionLabel('reportMenuAdmin', 'Administration')}
      </Typography>
      <List className={classes.list} disablePadding>
        <MenuItem
          title={t('sharedLogs')}
          link="/reports/logs"
          icon={<NotesIcon />}
          color="#64748b"
          selected={location.pathname === '/reports/logs'}
        />
        {!readonly && (
          <MenuItem
            title={t('reportScheduled')}
            link="/reports/scheduled"
            icon={<EventRepeatIcon />}
            color="#0ea5e9"
            selected={location.pathname === '/reports/scheduled'}
          />
        )}
        {admin && (
          <MenuItem
            title={t('statisticsTitle')}
            link="/reports/statistics"
            icon={<BarChartIcon />}
            color="#2b59c3"
            selected={location.pathname === '/reports/statistics'}
          />
        )}
        {admin && (
          <MenuItem
            title={t('reportAudit')}
            link="/reports/audit"
            icon={<VerifiedUserIcon />}
            color="#10b981"
            selected={location.pathname === '/reports/audit'}
          />
        )}
      </List>
    </Box>
  );
};

export default ReportsMenu;
