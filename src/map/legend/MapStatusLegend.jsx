import { useState } from 'react';
import { Box, IconButton, Paper, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { makeStyles } from 'tss-react/mui';
import PaletteIcon from '@mui/icons-material/Palette';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from '../../common/components/LocalizationProvider';

const useStyles = makeStyles()((theme) => ({
  root: {
    position: 'absolute',
    zIndex: 2,
    pointerEvents: 'auto',
    insetInlineStart: theme.spacing(1.5),
    bottom: theme.spacing(1.5),
    [theme.breakpoints.up('md')]: {
      insetInlineStart: `calc(${theme.dimensions.drawerWidthDesktop} + ${theme.spacing(3)})`,
      bottom: theme.spacing(3),
    },
  },
  paper: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: alpha(theme.palette.background.paper, 0.94),
    backdropFilter: 'blur(8px)',
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: theme.palette.mode === 'dark'
      ? '0 8px 24px rgba(0,0,0,0.4)'
      : '0 8px 24px rgba(15, 23, 42, 0.12)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
    padding: theme.spacing(0.75, 1, 0.5, 1.25),
  },
  title: {
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: theme.palette.text.secondary,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.65),
    padding: theme.spacing(0.25, 1.25, 1.1),
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: '0 0 0 1px rgba(0,0,0,0.12)',
  },
  label: {
    fontSize: '0.75rem',
    fontWeight: 600,
    lineHeight: 1.2,
    color: theme.palette.text.primary,
  },
  toggle: {
    width: 40,
    height: 40,
  },
}));

const MapStatusLegend = () => {
  const { classes } = useStyles();
  const theme = useTheme();
  const t = useTranslation();
  const [open, setOpen] = useState(true);

  const items = [
    { color: theme.palette.success.main, label: t('mapLegendMoving') || t('positionMotion') },
    { color: theme.palette.warning.main, label: t('mapLegendIgnitionOn') || t('positionIgnition') },
    { color: '#111111', label: t('mapLegendStopped') || t('reportStops') },
    { color: theme.palette.error.main, label: t('mapLegendOffline') || t('deviceStatusOffline') },
    { color: theme.palette.neutral.main, label: t('mapLegendUnknown') || t('deviceStatusUnknown') },
  ];

  return (
    <div className={classes.root}>
      <Paper className={classes.paper} elevation={0}>
        {!open ? (
          <IconButton className={classes.toggle} onClick={() => setOpen(true)} size="small">
            <PaletteIcon fontSize="small" />
          </IconButton>
        ) : (
          <>
            <div className={classes.header}>
              <Typography className={classes.title}>
                {t('deviceStatus')}
              </Typography>
              <IconButton size="small" onClick={() => setOpen(false)}>
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </div>
            <Box className={classes.list}>
              {items.map((item) => (
                <Box key={item.label} className={classes.item}>
                  <Box className={classes.dot} sx={{ bgcolor: item.color }} />
                  <Typography className={classes.label}>{item.label}</Typography>
                </Box>
              ))}
            </Box>
          </>
        )}
      </Paper>
    </div>
  );
};

export default MapStatusLegend;
