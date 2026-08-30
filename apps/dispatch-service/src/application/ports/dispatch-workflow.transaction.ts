import { Dispatch } from '../../domain/entities/dispatch.aggregate';
import { ScoredDriverCandidate } from '../scoring/driver-scoring.service';

export const DISPATCH_WORKFLOW_TRANSACTION = Symbol('DISPATCH_WORKFLOW_TRANSACTION');

export interface ReservationResultInput {
  dispatchId: string;
  orderId: string;
  driverId: string | null;
  reason: string | null;
  correlationId: string;
}

export interface DispatchStartPlan {
  strategyVersion: string;
  priority: string;
  searchRadiusKm: number;
  pickup: { latitude: number; longitude: number };
  rankedCandidates: ScoredDriverCandidate[];
}

export interface DispatchWorkflowTransaction {
  start(dispatch: Dispatch, plan?: DispatchStartPlan): Promise<void>;
  completeReservation(input: ReservationResultInput): Promise<void>;
  startCompensation(dispatchId: string, reason: string, correlationId: string): Promise<void>;
  completeCompensation(dispatchId: string, correlationId: string): Promise<void>;
  timeout(dispatchId: string, correlationId: string): Promise<void>;
}
