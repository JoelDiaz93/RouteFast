import { Dispatch } from '../../domain/entities/dispatch.aggregate';
export interface DispatchView {
  id: string; orderId: string; driverId: string | null; status: string; failureReason: string | null; correlationId: string; createdAt: string; updatedAt: string;
}
export const toDispatchView = (dispatch: Dispatch): DispatchView => ({
  id: dispatch.id,
  orderId: dispatch.orderId,
  driverId: dispatch.driverId,
  status: dispatch.status,
  failureReason: dispatch.failureReason,
  correlationId: dispatch.correlationId,
  createdAt: dispatch.createdAt.toISOString(),
  updatedAt: dispatch.updatedAt.toISOString(),
});
