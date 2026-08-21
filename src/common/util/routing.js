const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

export const getCurrentPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          const denied = new Error('LOCATION_DENIED');
          denied.code = 'LOCATION_DENIED';
          reject(denied);
          return;
        }
        reject(new Error(error.message || 'Unable to get current location'));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  });

export const fetchDrivingRoute = async (origin, destination) => {
  const query = new URLSearchParams({
    overview: 'full',
    geometries: 'geojson',
  });
  const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
  const response = await fetch(`${OSRM_URL}/${coordinates}?${query.toString()}`);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const data = await response.json();
  const route = data.routes?.[0];
  if (data.code !== 'Ok' || !route?.geometry?.coordinates?.length) {
    throw new Error(data.message || data.code || 'No route found');
  }
  return {
    coordinates: route.geometry.coordinates,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    origin,
    destination,
  };
};

export const fetchGoToRoute = async (destination) => {
  const origin = await getCurrentPosition();
  return fetchDrivingRoute(origin, destination);
};
