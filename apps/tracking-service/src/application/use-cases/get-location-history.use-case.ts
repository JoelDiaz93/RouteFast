import { DriverLocationView } from '../models/location.view';
import { LocationHistoryRepository } from '../ports/location-history.repository';

export class GetLocationHistoryUseCase {
  constructor(private readonly history: LocationHistoryRepository) {}
  execute(driverId: string, limit: number): Promise<DriverLocationView[]> {
    return this.history.getHistory(driverId, limit);
  }
}
