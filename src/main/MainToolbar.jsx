import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Toolbar,
  IconButton,
  Tooltip,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import MapIcon from '@mui/icons-material/Map';
import DnsIcon from '@mui/icons-material/Dns';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useDeviceReadonly } from '../common/util/permissions';

const useStyles = makeStyles()((theme) => ({
  toolbar: {
    display: 'flex',
    gap: theme.spacing(1),
    padding: theme.spacing(1, 1.5),
    background: theme.palette.mode === 'dark'
      ? 'linear-gradient(135deg, #1a2634 0%, #1e3044 100%)'
      : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
  },
}));

const MainToolbar = ({
  devicesOpen,
  setDevicesOpen,
}) => {
  const { classes } = useStyles();
  const navigate = useNavigate();
  const t = useTranslation();

  const deviceReadonly = useDeviceReadonly();
  const devices = useSelector((state) => state.devices.items);

  return (
    <Toolbar className={classes.toolbar}>
      <IconButton edge="start" onClick={() => setDevicesOpen(!devicesOpen)}>
        {devicesOpen ? <MapIcon /> : <DnsIcon />}
      </IconButton>
      <div style={{ flex: 1 }} />
      <IconButton edge="end" onClick={() => navigate('/settings/device')} disabled={deviceReadonly}>
        <Tooltip
          open={!deviceReadonly && Object.keys(devices).length === 0}
          title={t('deviceRegisterFirst')}
          arrow
        >
          <AddIcon />
        </Tooltip>
      </IconButton>
    </Toolbar>
  );
};

export default MainToolbar;
