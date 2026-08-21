import { IconButton, Paper, Typography } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import CloseIcon from '@mui/icons-material/Close';
import DirectionsIcon from '@mui/icons-material/Directions';
import ScheduleIcon from '@mui/icons-material/Schedule';
import StraightenIcon from '@mui/icons-material/Straighten';
import { useTranslation } from './LocalizationProvider';
import { useAttributePreference } from '../util/preferences';
import { formatDistance, formatNumericHours } from '../util/formatter';

const useStyles = makeStyles()((theme, { desktopPadding }) => ({
  root: {
    pointerEvents: 'none',
    position: 'fixed',
    zIndex: 6,
    left: '50%',
    transform: 'translateX(-50%)',
    [theme.breakpoints.up('md')]: {
      left: `calc(50% + ${desktopPadding} / 2)`,
      top: theme.spacing(2),
    },
    [theme.breakpoints.down('md')]: {
      top: 72,
    },
  },
  paper: {
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing(1.25),
    padding: theme.spacing(1, 1, 1, 1.5),
    borderRadius: 999,
    maxWidth: 'calc(100vw - 24px)',
    background: 'linear-gradient(180deg, #0f2744 0%, #0a1628 100%)',
    color: '#e3f2fd',
    border: '1px solid rgba(0, 229, 255, 0.28)',
    boxShadow: '0 8px 28px rgba(25, 118, 210, 0.35)',
  },
  icon: {
    color: '#00e5ff',
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    color: '#b3e5fc',
  },
  close: {
    color: '#90caf9',
  },
}));

const GoToRouteBar = ({ distanceMeters, durationSeconds, onClose, desktopPadding = 0 }) => {
  const { classes } = useStyles({ desktopPadding });
  const t = useTranslation();
  const distanceUnit = useAttributePreference('distanceUnit');

  return (
    <div className={classes.root}>
      <Paper elevation={4} className={classes.paper}>
        <DirectionsIcon className={classes.icon} fontSize="small" />
        <div className={classes.stat}>
          <StraightenIcon sx={{ fontSize: 16 }} />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {t('sharedDistance')}: {formatDistance(distanceMeters, distanceUnit, t)}
          </Typography>
        </div>
        <div className={classes.stat}>
          <ScheduleIcon sx={{ fontSize: 16 }} />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {t('reportDuration')}: {formatNumericHours(durationSeconds * 1000, t)}
          </Typography>
        </div>
        <IconButton size="small" className={classes.close} onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Paper>
    </div>
  );
};

export default GoToRouteBar;
