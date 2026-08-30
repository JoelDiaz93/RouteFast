import { DriverRepository } from '../ports/driver.repository';

export interface DriverCandidateView {
  id: string;
  displayName: string;
  capacity: number;
  currentLoad: number;
  remainingCapacity: number;
  loadRatio: number;
}

export class ListDriverCandidatesUseCase {
  constructor(private readonly repository: DriverRepository) {}

  async execute(limit = 20): Promise<DriverCandidateView[]> {
    const safeLimit = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 100) : 20;
    const drivers = await this.repository.findAvailableCandidates(safeLimit);
    return drivers.map((driver) => ({
        id: driver.id,
        displayName: driver.displayName,
        capacity: driver.capacity,
        currentLoad: driver.currentLoad,
        remainingCapacity: driver.capacity - driver.currentLoad,
        loadRatio: Number((driver.currentLoad / driver.capacity).toFixed(4)),
      }));
  }
}
