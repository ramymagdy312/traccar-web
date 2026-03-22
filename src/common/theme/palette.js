import { grey } from '@mui/material/colors';

const validatedColor = (color) => (/^#([0-9A-Fa-f]{3}){1,2}$/.test(color) ? color : null);

export default (server, darkMode) => ({
  mode: darkMode ? 'dark' : 'light',
  background: {
    default: darkMode ? '#0f1924' : '#f0f4f8',
    paper: darkMode ? '#1a2634' : '#ffffff',
  },
  primary: {
    main: validatedColor(server?.attributes?.colorPrimary) || (darkMode ? '#5c9eff' : '#1565c0'),
    light: darkMode ? '#8bbcff' : '#4791db',
    dark: darkMode ? '#2979ff' : '#003c8f',
    contrastText: '#ffffff',
  },
  secondary: {
    main: validatedColor(server?.attributes?.colorSecondary) || (darkMode ? '#4dd0e1' : '#00897b'),
    light: darkMode ? '#88ffff' : '#4ebaaa',
    dark: darkMode ? '#009faf' : '#005b4f',
    contrastText: '#ffffff',
  },
  success: {
    main: darkMode ? '#66bb6a' : '#2e7d32',
    light: darkMode ? '#98ee99' : '#60ad5e',
  },
  warning: {
    main: darkMode ? '#ffa726' : '#ed6c02',
  },
  error: {
    main: darkMode ? '#ef5350' : '#d32f2f',
  },
  info: {
    main: darkMode ? '#42a5f5' : '#0288d1',
  },
  neutral: {
    main: grey[500],
  },
  geometry: {
    main: '#3bb2d0',
  },
  alwaysDark: {
    main: grey[900],
  },
  divider: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
  text: {
    primary: darkMode ? '#e3e8ef' : '#1a2027',
    secondary: darkMode ? '#94a3b8' : '#556070',
  },
});
