import { Dispatch } from '../../domain/entities/dispatch.aggregate';

export const DISPATCH_WORKFLOW_TRANSACTION = Symbol('DISPATCH_WORKFLOW_TRANSACTION');

export interface ReservationResultInput {
  dispatchId: string;
  orderId: string;
  driverId: string | null;
  reason: string | null;
  correlationId: string;
}

export interface DispatchWorkflowTransaction {
  start(dispatch: Dispatch): Promise<void>;
  completeReservation(input: ReservationResultInput): Promise<void>;
  startCompensation(dispatchId: string, reason: string, correlationId: string): Promise<void>;
  completeCompensation(dispatchId: string, correlationId: string): Promise<void>;
  timeout(dispatchId: string, correlationId: string): Promise<void>;
}
