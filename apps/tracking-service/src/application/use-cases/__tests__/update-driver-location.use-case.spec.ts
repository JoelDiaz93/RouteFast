import { DriverLocationView } from '../../models/location.view';
import { LiveLocationStore } from '../../ports/live-location.store';
import { LocationPersistenceQueue } from '../../ports/location-persistence.queue';
import { UpdateDriverLocationUseCase } from '../update-driver-location.use-case';

class FakeLiveStore implements LiveLocationStore {
  constructor(private readonly accepted: boolean) {}
  upsert(): Promise<boolean> { return Promise.resolve(this.accepted); }
  get(): Promise<DriverLocationView | null> { return Promise.resolve(null); }
  findNearby(): Promise<[]> { return Promise.resolve([]); }
}

class FakeQueue implements LocationPersistenceQueue {
  readonly persisted: DriverLocationView[] = [];
  async enqueue(location: DriverLocationView): Promise<void> { this.persisted.push(location); }
}

describe('UpdateDriverLocationUseCase', () => {
  it('persists historical sample even when it is rejected as current hot state', async () => {
    const queue = new FakeQueue();
    const useCase = new UpdateDriverLocationUseCase(new FakeLiveStore(false), queue);
    const result = await useCase.execute({
      driverId: '550e8400-e29b-41d4-a716-446655440000',
      latitude: -0.16,
      longitude: -78.47,
      recordedAt: '2026-08-29T03:00:00.000Z',
    });
    expect(result.acceptedAsCurrent).toBe(false);
    expect(queue.persisted).toHaveLength(1);
  });
});
