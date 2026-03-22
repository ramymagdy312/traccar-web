export default {
  MuiUseMediaQuery: {
    defaultProps: {
      noSsr: true,
    },
  },
  MuiCssBaseline: {
    styleOverrides: {
      '*::-webkit-scrollbar': {
        width: '6px',
        height: '6px',
      },
      '*::-webkit-scrollbar-track': {
        background: 'transparent',
      },
      '*::-webkit-scrollbar-thumb': {
        background: 'rgba(0,0,0,0.15)',
        borderRadius: '3px',
      },
      '*::-webkit-scrollbar-thumb:hover': {
        background: 'rgba(0,0,0,0.25)',
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
      },
      elevation3: ({ theme }) => ({
        boxShadow: theme.palette.mode === 'dark'
          ? '0 2px 12px 0 rgba(0,0,0,0.4)'
          : '0 2px 12px 0 rgba(0,0,0,0.08)',
      }),
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
        borderRadius: '10px',
        transition: 'background-color 0.2s, box-shadow 0.2s',
        '&:hover': {
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        },
        '&.Mui-focused': {
          backgroundColor: theme.palette.background.paper,
          boxShadow: `0 0 0 2px ${theme.palette.primary.main}33`,
        },
      }),
      notchedOutline: ({ theme }) => ({
        borderColor: theme.palette.divider,
      }),
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: '10px',
        textTransform: 'none',
        fontWeight: 600,
        letterSpacing: '0.01em',
      },
      sizeMedium: {
        height: '42px',
        padding: '8px 22px',
      },
      contained: ({ theme }) => ({
        boxShadow: 'none',
        '&:hover': {
          boxShadow: `0 4px 12px ${theme.palette.primary.main}40`,
        },
      }),
    },
  },
  MuiFormControl: {
    defaultProps: {
      size: 'small',
    },
  },
  MuiSnackbar: {
    defaultProps: {
      anchorOrigin: {
        vertical: 'bottom',
        horizontal: 'center',
      },
    },
  },
  MuiTooltip: {
    defaultProps: {
      enterDelay: 500,
      enterNextDelay: 500,
    },
    styleOverrides: {
      tooltip: ({ theme }) => ({
        backgroundColor: theme.palette.mode === 'dark' ? '#334155' : '#1e293b',
        borderRadius: '8px',
        fontSize: '0.75rem',
        padding: '6px 12px',
      }),
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: ({ theme }) => ({
        '@media print': {
          color: theme.palette.alwaysDark.main,
        },
      }),
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: '8px',
        margin: '2px 6px',
        transition: 'background-color 0.15s',
        '&.Mui-selected': {
          backgroundColor: theme.palette.mode === 'dark'
            ? 'rgba(92,158,255,0.12)'
            : 'rgba(21,101,192,0.08)',
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark'
              ? 'rgba(92,158,255,0.18)'
              : 'rgba(21,101,192,0.14)',
          },
        },
      }),
    },
  },
  MuiAvatar: {
    styleOverrides: {
      root: ({ theme }) => ({
        background: theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)'
          : 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
        boxShadow: '0 2px 8px rgba(21,101,192,0.25)',
      }),
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: ({ theme }) => ({
        borderRight: `1px solid ${theme.palette.divider}`,
      }),
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
      },
    },
  },
  MuiBottomNavigation: {
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundColor: theme.palette.background.paper,
        borderTop: `1px solid ${theme.palette.divider}`,
      }),
    },
  },
  MuiBottomNavigationAction: {
    styleOverrides: {
      root: ({ theme }) => ({
        color: theme.palette.text.secondary,
        '&.Mui-selected': {
          color: theme.palette.primary.main,
        },
        transition: 'color 0.2s',
      }),
    },
  },
  MuiToolbar: {
    styleOverrides: {
      root: {
        minHeight: '56px !important',
      },
    },
  },
  MuiDivider: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderColor: theme.palette.divider,
      }),
    },
  },
};
