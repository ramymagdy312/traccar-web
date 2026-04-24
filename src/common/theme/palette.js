import { grey } from '@mui/material/colors';

const validatedColor = (color) => (/^#([0-9A-Fa-f]{3}){1,2}$/.test(color) ? color : null);

export default (server, darkMode) => ({
  mode: darkMode ? 'dark' : 'light',
  background: {
    default: darkMode ? '#0f1924' : '#f8f9fa',
    paper: darkMode ? '#1a2634' : '#ffffff',
  },
  primary: {
    main: validatedColor(server?.attributes?.colorPrimary) || (darkMode ? '#5c9eff' : '#2b59c3'),
    light: darkMode ? '#8bbcff' : '#5b7fd6',
    dark: darkMode ? '#2979ff' : '#1e408f',
    contrastText: '#ffffff',
  },
  secondary: {
    main: validatedColor(server?.attributes?.colorSecondary) || (darkMode ? '#ce93d8' : '#7b1fa2'),
    light: darkMode ? '#f3e5f5' : '#9c4dcc',
    dark: darkMode ? '#8e24aa' : '#4a148c',
    contrastText: '#ffffff',
  },
  success: {
    main: darkMode ? '#66bb6a' : '#2e7d32',
    light: darkMode ? '#98ee99' : '#60ad5e',
  },
  warning: {
    main: darkMode ? '#ffa726' : '#ef6c00',
  },
  error: {
    main: darkMode ? '#ef5350' : '#c62828',
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
