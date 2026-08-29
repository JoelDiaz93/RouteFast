export const DRIVER_EVENT_PUBLISHER = Symbol('DRIVER_EVENT_PUBLISHER');

export interface DriverReservationResult {
  orderId: string;
  dispatchId: string;
  driverId?: string;
  reason?: string;
  correlationId: string;
}

export interface DriverEventPublisher {
  reserved(result: DriverReservationResult & { driverId: string }): Promise<void>;
  reservationFailed(result: DriverReservationResult & { reason: string }): Promise<void>;
}
