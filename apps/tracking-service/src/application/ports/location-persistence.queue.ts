import { DriverLocationView } from '../models/location.view';

export const LOCATION_PERSISTENCE_QUEUE = Symbol('LOCATION_PERSISTENCE_QUEUE');

export interface LocationPersistenceQueue {
  enqueue(location: DriverLocationView): Promise<void>;
}
