import { Coordinates } from '../../domain/value-objects/coordinates.vo';
import { DriverLocationView } from '../models/location.view';
import { LiveLocationStore } from '../ports/live-location.store';
import { LocationPersistenceQueue } from '../ports/location-persistence.queue';

export interface UpdateDriverLocationInput {
  driverId: string;
  latitude: number;
  longitude: number;
  speedKph?: number | null;
  headingDegrees?: number | null;
  recordedAt?: string;
}

export interface DriverLocationUpdateResult {
  location: DriverLocationView;
  acceptedAsCurrent: boolean;
}

export class UpdateDriverLocationUseCase {
  constructor(
    private readonly liveStore: LiveLocationStore,
    private readonly persistenceQueue: LocationPersistenceQueue,
  ) {}

  async execute(input: UpdateDriverLocationInput): Promise<DriverLocationUpdateResult> {
    const driverId = input.driverId.trim();
    if (!driverId) throw new Error('driverId is required');
    const coordinates = Coordinates.create(input.latitude, input.longitude);
    const now = new Date();
    const recordedAt = input.recordedAt ? new Date(input.recordedAt) : now;
    if (Number.isNaN(recordedAt.getTime())) throw new Error('recordedAt must be a valid ISO date');
    const speedKph = input.speedKph ?? null;
    if (speedKph !== null && (!Number.isFinite(speedKph) || speedKph < 0 || speedKph > 250)) {
      throw new Error('speedKph must be between 0 and 250');
    }
    const headingDegrees = input.headingDegrees ?? null;
    if (headingDegrees !== null && (!Number.isFinite(headingDegrees) || headingDegrees < 0 || headingDegrees >= 360)) {
      throw new Error('headingDegrees must be between 0 and 359.999');
    }

    const view: DriverLocationView = {
      driverId,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      speedKph,
      headingDegrees,
      recordedAt: recordedAt.toISOString(),
      receivedAt: now.toISOString(),
    };

    // Hot state is updated first for real-time consumers. Durable history is asynchronous.
    const acceptedAsCurrent = await this.liveStore.upsert(view);
    // Out-of-order GPS samples still belong in durable history, but must not rewind hot state.
    await this.persistenceQueue.enqueue(view);
    return { location: view, acceptedAsCurrent };
  }
}
