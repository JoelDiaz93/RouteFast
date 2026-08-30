import { DriverLocationView, NearbyDriverView } from '../models/location.view';

export const LIVE_LOCATION_STORE = Symbol('LIVE_LOCATION_STORE');

export interface NearbySearchInput {
  latitude: number;
  longitude: number;
  radiusKm: number;
  limit: number;
  candidateDriverIds?: string[];
  maxAgeSeconds?: number;
}

export interface LiveLocationStore {
  upsert(location: DriverLocationView): Promise<boolean>;
  get(driverId: string): Promise<DriverLocationView | null>;
  findNearby(input: NearbySearchInput): Promise<NearbyDriverView[]>;
}
