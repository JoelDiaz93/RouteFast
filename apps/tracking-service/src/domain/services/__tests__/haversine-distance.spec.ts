import { haversineDistanceKm } from '../haversine-distance';

describe('haversineDistanceKm', () => {
  it('returns zero for the same point', () => {
    expect(haversineDistanceKm(-0.18, -78.46, -0.18, -78.46)).toBeCloseTo(0, 8);
  });

  it('returns a positive symmetric distance', () => {
    const a = haversineDistanceKm(-0.1807, -78.4678, -0.1500, -78.4900);
    const b = haversineDistanceKm(-0.1500, -78.4900, -0.1807, -78.4678);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeCloseTo(b, 8);
  });
});
