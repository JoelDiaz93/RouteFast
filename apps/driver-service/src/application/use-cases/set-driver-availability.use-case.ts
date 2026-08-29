import { DriverStatus } from '../../domain/entities/driver-status.enum';
import { DriverRepository } from '../ports/driver.repository';
import { DriverView, toDriverView } from './driver.view';

export class SetDriverAvailabilityUseCase {
  constructor(private readonly repository: DriverRepository) {}

  async execute(driverId: string, status: DriverStatus.AVAILABLE | DriverStatus.OFFLINE): Promise<DriverView> {
    const driver = await this.repository.findById(driverId);
    if (!driver) throw new Error(`Driver ${driverId} not found`);
    status === DriverStatus.AVAILABLE ? driver.setAvailable() : driver.setOffline();
    await this.repository.save(driver);
    return toDriverView(driver);
  }
}
