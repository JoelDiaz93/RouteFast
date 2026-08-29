import { Coordinates } from './coordinates.vo';

export class Location {
  private constructor(
    public readonly label: string,
    public readonly address: string,
    public readonly coordinates: Coordinates,
  ) {}

  static create(input: {
    label: string;
    address: string;
    latitude: number;
    longitude: number;
  }): Location {
    const label = input.label.trim();
    const address = input.address.trim();

    if (!label) {
      throw new Error('Location label is required');
    }

    if (!address) {
      throw new Error('Location address is required');
    }

    return new Location(
      label,
      address,
      Coordinates.create(input.latitude, input.longitude),
    );
  }
}
