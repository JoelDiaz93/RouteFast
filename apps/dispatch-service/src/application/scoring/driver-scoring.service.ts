export interface DriverCapacityCandidate {
  id: string;
  displayName: string;
  capacity: number;
  currentLoad: number;
  remainingCapacity: number;
  loadRatio: number;
}

export interface DriverGeoCandidate {
  driverId: string;
  distanceKm: number;
  ageSeconds: number;
  latitude: number;
  longitude: number;
}

export type SlaRisk = 'HEALTHY' | 'AT_RISK' | 'BREACH';

export interface ScoredDriverCandidate {
  driverId: string;
  score: number;
  distanceKm: number;
  locationAgeSeconds: number;
  remainingCapacity: number;
  loadRatio: number;
  estimatedPickupMinutes: number;
  slaRisk: SlaRisk;
  components: {
    distance: number;
    capacity: number;
    load: number;
    freshness: number;
  };
}

export interface DriverScoringConfig {
  distanceWeight: number;
  capacityWeight: number;
  loadWeight: number;
  freshnessWeight: number;
  maxLocationAgeSeconds: number;
  averageSpeedKph: number;
  roadFactor: number;
}

export class DriverScoringService {
  constructor(private readonly config: DriverScoringConfig) {}

  rank(input: {
    drivers: DriverCapacityCandidate[];
    locations: DriverGeoCandidate[];
    radiusKm: number;
    priority: string;
  }): ScoredDriverCandidate[] {
    const drivers = new Map(input.drivers.map((driver) => [driver.id, driver]));
    const slaMinutes = input.priority === 'EXPRESS' ? 8 : input.priority === 'SCHEDULED' ? 25 : 15;

    return input.locations
      .map((location): ScoredDriverCandidate | null => {
        const driver = drivers.get(location.driverId);
        if (!driver || driver.remainingCapacity < 1) return null;
        const distance = clamp01(1 - location.distanceKm / input.radiusKm);
        const capacity = clamp01(driver.remainingCapacity / Math.max(driver.capacity, 1));
        const load = clamp01(1 - driver.loadRatio);
        const freshness = clamp01(1 - location.ageSeconds / this.config.maxLocationAgeSeconds);
        const score = 100 * (
          distance * this.config.distanceWeight
          + capacity * this.config.capacityWeight
          + load * this.config.loadWeight
          + freshness * this.config.freshnessWeight
        );
        const routeDistanceKm = location.distanceKm * this.config.roadFactor;
        const estimatedPickupMinutes = Math.max(1, Math.ceil((routeDistanceKm / this.config.averageSpeedKph) * 60));
        const slaRisk: SlaRisk = estimatedPickupMinutes > slaMinutes
          ? 'BREACH'
          : estimatedPickupMinutes >= slaMinutes * 0.8 ? 'AT_RISK' : 'HEALTHY';
        return {
          driverId: driver.id,
          score: Number(score.toFixed(2)),
          distanceKm: location.distanceKm,
          locationAgeSeconds: location.ageSeconds,
          remainingCapacity: driver.remainingCapacity,
          loadRatio: driver.loadRatio,
          estimatedPickupMinutes,
          slaRisk,
          components: {
            distance: Number(distance.toFixed(4)),
            capacity: Number(capacity.toFixed(4)),
            load: Number(load.toFixed(4)),
            freshness: Number(freshness.toFixed(4)),
          },
        };
      })
      .filter((candidate): candidate is ScoredDriverCandidate => candidate !== null)
      .sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm || a.driverId.localeCompare(b.driverId));
  }
}

function clamp01(value: number): number { return Math.max(0, Math.min(1, value)); }
