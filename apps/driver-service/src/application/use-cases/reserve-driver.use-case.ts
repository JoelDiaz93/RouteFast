import { DriverEventPublisher } from '../ports/driver-event.publisher';
import { DriverRepository } from '../ports/driver.repository';

export interface ReserveDriverCommand {
  orderId: string;
  dispatchId: string;
  correlationId: string;
}

export class ReserveDriverUseCase {
  constructor(
    private readonly repository: DriverRepository,
    private readonly publisher: DriverEventPublisher,
  ) {}

  async execute(command: ReserveDriverCommand): Promise<void> {
    // Phase 2 selection is intentionally simple. Atomic/concurrent reservation is hardened in Phase 3.
    const driver = await this.repository.findFirstAvailable();
    if (!driver) {
      await this.publisher.reservationFailed({
        ...command,
        reason: 'NO_AVAILABLE_DRIVER',
      });
      return;
    }

    driver.reserve(command.orderId);
    await this.repository.save(driver);
    await this.publisher.reserved({ ...command, driverId: driver.id });
  }
}
