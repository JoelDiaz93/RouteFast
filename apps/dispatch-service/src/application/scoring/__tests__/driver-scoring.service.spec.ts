import { DriverScoringService } from '../driver-scoring.service';

describe('DriverScoringService', () => {
  const service = new DriverScoringService({
    distanceWeight: 0.55,
    capacityWeight: 0.20,
    loadWeight: 0.15,
    freshnessWeight: 0.10,
    maxLocationAgeSeconds: 90,
    averageSpeedKph: 30,
    roadFactor: 1.2,
  });

  it('ranks a closer fresh driver above a farther equally loaded driver', () => {
    const result = service.rank({
      priority: 'STANDARD', radiusKm: 10,
      drivers: [
        { id: 'a', displayName: 'A', capacity: 2, currentLoad: 0, remainingCapacity: 2, loadRatio: 0 },
        { id: 'b', displayName: 'B', capacity: 2, currentLoad: 0, remainingCapacity: 2, loadRatio: 0 },
      ],
      locations: [
        { driverId: 'a', distanceKm: 1, ageSeconds: 3, latitude: 0, longitude: 0 },
        { driverId: 'b', distanceKm: 6, ageSeconds: 3, latitude: 0, longitude: 0 },
      ],
    });
    expect(result.map((candidate) => candidate.driverId)).toEqual(['a', 'b']);
    const first = result[0];
    const second = result[1];
    if (!first || !second) throw new Error('expected two ranked candidates');
    expect(first.score).toBeGreaterThan(second.score);
  });

  it('marks pickup estimates beyond express SLA as breach', () => {
    const result = service.rank({
      priority: 'EXPRESS', radiusKm: 10,
      drivers: [{ id: 'a', displayName: 'A', capacity: 1, currentLoad: 0, remainingCapacity: 1, loadRatio: 0 }],
      locations: [{ driverId: 'a', distanceKm: 8, ageSeconds: 2, latitude: 0, longitude: 0 }],
    });
    const first = result[0];
    if (!first) throw new Error('expected a ranked candidate');
    expect(first.slaRisk).toBe('BREACH');
  });
});
