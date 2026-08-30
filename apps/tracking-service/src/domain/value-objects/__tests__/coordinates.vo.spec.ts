import { Coordinates } from '../coordinates.vo';

describe('Coordinates', () => {
  it('accepts valid coordinates', () => {
    const value = Coordinates.create(-0.1807, -78.4678);
    expect(value.latitude).toBe(-0.1807);
    expect(value.longitude).toBe(-78.4678);
  });

  it('rejects invalid latitude', () => {
    expect(() => Coordinates.create(91, 0)).toThrow('latitude');
  });

  it('rejects invalid longitude', () => {
    expect(() => Coordinates.create(0, 181)).toThrow('longitude');
  });
});
