export class Coordinates {
  private constructor(
    public readonly latitude: number,
    public readonly longitude: number,
  ) {}

  static create(latitude: number, longitude: number): Coordinates {
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      throw new Error(`Invalid latitude: ${latitude}`);
    }

    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new Error(`Invalid longitude: ${longitude}`);
    }

    return new Coordinates(latitude, longitude);
  }
}
