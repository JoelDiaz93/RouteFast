import { Coordinates } from '../../domain/value-objects/coordinates.vo';
import { NearbyDriverView } from '../models/location.view';
import { LiveLocationStore } from '../ports/live-location.store';

export class FindNearbyDriversUseCase {
  constructor(private readonly liveStore: LiveLocationStore) {}

  execute(input: {
    latitude: number;
    longitude: number;
    radiusKm: number;
    limit: number;
    candidateDriverIds?: string[];
    maxAgeSeconds?: number;
  }): Promise<NearbyDriverView[]> {
    Coordinates.create(input.latitude, input.longitude);
    if (!Number.isFinite(input.radiusKm) || input.radiusKm <= 0 || input.radiusKm > 100) {
      throw new Error('radiusKm must be greater than 0 and <= 100');
    }
    if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 100) {
      throw new Error('limit must be between 1 and 100');
    }
    return this.liveStore.findNearby(input);
  }
}
