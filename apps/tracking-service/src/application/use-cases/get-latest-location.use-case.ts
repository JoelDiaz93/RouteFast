import { DriverLocationView } from '../models/location.view';
import { LiveLocationStore } from '../ports/live-location.store';
import { LocationHistoryRepository } from '../ports/location-history.repository';

export class GetLatestLocationUseCase {
  constructor(
    private readonly liveStore: LiveLocationStore,
    private readonly history: LocationHistoryRepository,
  ) {}

  async execute(driverId: string): Promise<DriverLocationView | null> {
    return (await this.liveStore.get(driverId)) ?? this.history.getLatest(driverId);
  }
}
