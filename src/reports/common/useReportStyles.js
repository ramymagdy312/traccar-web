import { makeStyles } from 'tss-react/mui';

export default makeStyles()((theme) => ({
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  containerMap: {
    flexBasis: '40%',
    flexShrink: 0,
  },
  containerMain: {
    overflow: 'auto',
  },
  header: {
    position: 'sticky',
    left: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  columnAction: {
    width: '1%',
    paddingLeft: theme.spacing(1),
    '@media print': {
      display: 'none',
    },
  },
  columnActionContainer: {
    display: 'flex',
  },
  filter: {
    display: 'inline-flex',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
    padding: theme.spacing(3, 2, 2),
    '@media print': {
      display: 'none !important',
    },
    [theme.breakpoints.down('md')]: {
      gap: theme.spacing(1.25),
      padding: theme.spacing(1.5, 1.5, 1),
    },
  },
  filterItem: {
    minWidth: 0,
    flex: `1 1 ${theme.dimensions.filterFormWidth}`,
    [theme.breakpoints.down('md')]: {
      flex: '1 1 100%',
    },
  },
  filterButtons: {
    display: 'flex',
    gap: theme.spacing(1),
    flex: `1 1 ${theme.dimensions.filterFormWidth}`,
    [theme.breakpoints.down('md')]: {
      flex: '1 1 100%',
    },
  },
  filterButton: {
    flexGrow: 1,
  },
  chart: {
    flexGrow: 1,
    overflow: 'hidden',
  },
  actionCellPadding: {
    '&.MuiTableCell-body': {
      paddingTop: 0,
      paddingBottom: 0,
    },
    '@media print': {
      display: 'none',
    },
  },
}));
