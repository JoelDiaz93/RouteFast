const EARTH_RADIUS_KM = 6371.0088;
const radians = (degrees: number): number => (degrees * Math.PI) / 180;

export function haversineDistanceKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const latDelta = radians(latitudeB - latitudeA);
  const lonDelta = radians(longitudeB - longitudeA);
  const latA = radians(latitudeA);
  const latB = radians(latitudeB);
  const a = Math.sin(latDelta / 2) ** 2
    + Math.cos(latA) * Math.cos(latB) * Math.sin(lonDelta / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
