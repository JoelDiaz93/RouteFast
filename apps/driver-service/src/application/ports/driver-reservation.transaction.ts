export const DRIVER_RESERVATION_TRANSACTION = Symbol('DRIVER_RESERVATION_TRANSACTION');

export interface ReserveDriverInput {
  orderId: string;
  dispatchId: string;
  correlationId: string;
  candidateDriverIds?: string[];
}

export interface ReleaseDriverInput extends ReserveDriverInput {
  driverId: string;
}

export interface DriverReservationTransaction {
  reserve(input: ReserveDriverInput): Promise<void>;
  release(input: ReleaseDriverInput): Promise<void>;
}
