import { DriverLocationView } from '../models/location.view';

export const LOCATION_HISTORY_REPOSITORY = Symbol('LOCATION_HISTORY_REPOSITORY');

export interface LocationHistoryRepository {
  append(location: DriverLocationView): Promise<void>;
  getLatest(driverId: string): Promise<DriverLocationView | null>;
  getHistory(driverId: string, limit: number): Promise<DriverLocationView[]>;
}
