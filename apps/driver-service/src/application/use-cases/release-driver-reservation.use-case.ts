import { DriverReservationTransaction, ReleaseDriverInput } from '../ports/driver-reservation.transaction';

export class ReleaseDriverReservationUseCase {
  constructor(private readonly transaction: DriverReservationTransaction) {}
  execute(command: ReleaseDriverInput): Promise<void> { return this.transaction.release(command); }
}
