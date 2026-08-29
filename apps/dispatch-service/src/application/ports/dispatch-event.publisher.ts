export const DISPATCH_EVENT_PUBLISHER = Symbol('DISPATCH_EVENT_PUBLISHER');
export interface DispatchEventPublisher {
  dispatchStarted(input: { dispatchId: string; orderId: string; correlationId: string }): Promise<void>;
  requestDriverReservation(input: { dispatchId: string; orderId: string; correlationId: string }): Promise<void>;
  dispatchAssigned(input: { dispatchId: string; orderId: string; driverId: string; correlationId: string }): Promise<void>;
  dispatchFailed(input: { dispatchId: string; orderId: string; reason: string; correlationId: string }): Promise<void>;
}
