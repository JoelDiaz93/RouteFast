import { Driver } from '../../domain/entities/driver.aggregate';
export interface DriverView {
  id: string; displayName: string; capacity: number; currentLoad: number; remainingCapacity: number; status: string; reservedOrderIds: readonly string[]; createdAt: string; updatedAt: string;
}
export const toDriverView = (driver: Driver): DriverView => ({
  id: driver.id, displayName: driver.displayName, capacity: driver.capacity, currentLoad: driver.currentLoad,
  remainingCapacity: driver.capacity - driver.currentLoad, status: driver.status, reservedOrderIds: driver.reservedOrderIds,
  createdAt: driver.createdAt.toISOString(), updatedAt: driver.updatedAt.toISOString(),
});
