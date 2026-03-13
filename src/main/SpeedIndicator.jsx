import React from 'react';
import { Tooltip } from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import { useTranslation } from '../common/components/LocalizationProvider';

const SpeedIndicator = ({ speed }) => {
  const t = useTranslation();
  const speedLimit = 54;
  
  return speed > speedLimit ? (
    <Tooltip title={t('notificationSpeedExceeded')}>
      <SpeedIcon color="error" style={{ marginLeft: 8 }} />
    </Tooltip>
  ) : speed? 
    <Tooltip title={t('notificationSpeedExceeded')}>
      <SpeedIcon color= 'primary'  style={{ marginLeft: 8 }} />
    </Tooltip> : null;
};

export default SpeedIndicator;