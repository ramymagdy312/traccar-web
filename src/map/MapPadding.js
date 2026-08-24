import { useEffect } from 'react';

import { map } from './core/MapView';
import { useTheme } from '@mui/material';

const MapPadding = ({ start = 0, bottom = 0 }) => {
  const theme = useTheme();

  useEffect(() => {
    const startKey = theme.direction === 'rtl' ? 'right' : 'left';
    const topStart = document.querySelector(`.maplibregl-ctrl-top-${startKey}`);
    const bottomStart = document.querySelector(`.maplibregl-ctrl-bottom-${startKey}`);
    if (topStart) {
      topStart.style.insetInlineStart = `${start}px`;
    }
    if (bottomStart) {
      bottomStart.style.insetInlineStart = `${start}px`;
    }
    map.setPadding({
      [theme.direction === 'rtl' ? 'right' : 'left']: start,
      bottom,
    });
    return () => {
      if (topStart) {
        topStart.style.insetInlineStart = 0;
      }
      if (bottomStart) {
        bottomStart.style.insetInlineStart = 0;
      }
      map.setPadding({ top: 0, right: 0, bottom: 0, left: 0 });
    };
  }, [start, bottom, theme.direction]);

  return null;
};

export default MapPadding;
