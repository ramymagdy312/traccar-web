import { makeStyles } from 'tss-react/mui';
import { Box, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Link } from 'react-router-dom';

const useStyles = makeStyles()((theme) => ({
  item: {
    borderRadius: 12,
    margin: '3px 8px',
    padding: '6px 10px',
    minHeight: 44,
    gap: theme.spacing(0.5),
    overflow: 'hidden',
    position: 'relative',
    transition: 'background-color 0.18s ease, transform 0.18s ease',
    '&::before': {
      content: '""',
      position: 'absolute',
      insetInlineStart: 0,
      top: 10,
      bottom: 10,
      width: 3,
      borderRadius: 3,
      background: 'transparent',
      transition: 'background-color 0.18s ease',
    },
    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark'
        ? alpha(theme.palette.common.white, 0.06)
        : alpha(theme.palette.common.black, 0.04),
    },
    '&.Mui-selected': {
      backgroundColor: 'transparent',
      '&:hover': {
        backgroundColor: 'transparent',
      },
      '& .MuiListItemText-primary': {
        fontWeight: 600,
      },
    },
  },
  icon: {
    minWidth: 0,
    marginInlineEnd: theme.spacing(1.25),
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'background-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease',
    '& .MuiSvgIcon-root': {
      fontSize: 20,
    },
  },
  text: {
    margin: 0,
    '& .MuiListItemText-primary': {
      whiteSpace: 'nowrap',
      fontSize: '0.875rem',
      fontWeight: 500,
      letterSpacing: '-0.01em',
      lineHeight: 1.3,
    },
  },
}));

const MenuItem = ({ title, link, icon, selected, color }) => {
  const { classes } = useStyles();
  const theme = useTheme();
  const accent = color || theme.palette.primary.main;
  const selectedFill = alpha(accent, theme.palette.mode === 'dark' ? 0.18 : 0.1);

  return (
    <ListItemButton
      key={link}
      component={Link}
      to={link}
      selected={selected}
      className={classes.item}
      sx={selected ? {
        backgroundColor: `${selectedFill} !important`,
        '&::before': { backgroundColor: accent },
        '& .MuiListItemText-primary': { color: accent },
      } : undefined}
    >
      <ListItemIcon className={classes.icon}>
        <Box
          className={classes.iconBox}
          sx={{
            backgroundColor: selected
              ? accent
              : alpha(accent, theme.palette.mode === 'dark' ? 0.2 : 0.12),
            color: selected ? theme.palette.common.white : accent,
            boxShadow: selected ? `0 4px 10px ${alpha(accent, 0.35)}` : 'none',
          }}
        >
          {icon}
        </Box>
      </ListItemIcon>
      <ListItemText primary={title} className={classes.text} />
    </ListItemButton>
  );
};

export default MenuItem;
