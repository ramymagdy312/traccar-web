import { useEffect, useState } from 'react';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import defaultLogoUrl from '../resources/images/logo.svg?url';

const useStyles = makeStyles()((theme) => ({
  image: {
    alignSelf: 'center',
    display: 'block',
    maxWidth: '240px',
    maxHeight: '120px',
    width: 'auto',
    height: 'auto',
    margin: theme.spacing(2),
    objectFit: 'contain',
  },
  /** Sidebar: flat white glyph, slight transparency so it reads as part of the panel */
  imageOnSidebar: {
    filter: 'brightness(0) invert(1)',
    opacity: theme.palette.mode === 'dark' ? 0.88 : 0.92,
    zIndex: 1,
  },
}));

const trimOrNull = (value) => {
  if (value == null) return null;
  const s = String(value).trim();
  return s || null;
};

/**
 * @param {'onLight' | 'onDark'} variant — onDark: white logo on blue sidebar; onLight: original colors on white
 */
const LogoImage = ({ variant = 'onLight' }) => {
  const theme = useTheme();
  const { classes, cx } = useStyles();

  const expanded = !useMediaQuery(theme.breakpoints.down('lg'));

  const logo = useSelector((state) => trimOrNull(state.session.server?.attributes?.logo));
  const logoInverted = useSelector((state) => trimOrNull(state.session.server?.attributes?.logoInverted));

  const [serverFailed, setServerFailed] = useState(false);

  useEffect(() => {
    setServerFailed(false);
  }, [logo, logoInverted]);

  const serverSrc = expanded && logoInverted ? logoInverted : logo;
  const useServer = Boolean(serverSrc) && !serverFailed;

  const onDark = variant === 'onDark';
  const imgClass = cx(classes.image, onDark && classes.imageOnSidebar);

  if (useServer) {
    return (
      <img
        className={imgClass}
        src={serverSrc}
        alt=""
        onError={() => setServerFailed(true)}
      />
    );
  }

  return (
    <img
      className={imgClass}
      src={defaultLogoUrl}
      alt=""
    />
  );
};

export default LogoImage;
