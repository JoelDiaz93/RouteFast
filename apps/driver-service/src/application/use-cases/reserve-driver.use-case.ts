import { DriverReservationTransaction, ReserveDriverInput } from '../ports/driver-reservation.transaction';

export class ReserveDriverUseCase {
  constructor(private readonly transaction: DriverReservationTransaction) {}
  execute(command: ReserveDriverInput): Promise<void> { return this.transaction.reserve(command); }
}
