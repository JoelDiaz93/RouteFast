export interface DriverLocationView {
  driverId: string;
  latitude: number;
  longitude: number;
  speedKph: number | null;
  headingDegrees: number | null;
  recordedAt: string;
  receivedAt: string;
}

export interface NearbyDriverView extends DriverLocationView {
  distanceKm: number;
  ageSeconds: number;
}

export interface EtaView {
  driverId: string;
  distanceKm: number;
  estimatedMinutes: number;
  averageSpeedKph: number;
  roadFactor: number;
  locationAgeSeconds: number;
}
