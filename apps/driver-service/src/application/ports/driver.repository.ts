import { Driver } from '../../domain/entities/driver.aggregate';

export const DRIVER_REPOSITORY = Symbol('DRIVER_REPOSITORY');

export interface DriverRepository {
  save(driver: Driver): Promise<void>;
  findById(driverId: string): Promise<Driver | null>;
  findAll(): Promise<Driver[]>;
  findFirstAvailable(): Promise<Driver | null>;
}
