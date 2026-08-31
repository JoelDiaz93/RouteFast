import { Dispatch } from '../../domain/entities/dispatch.aggregate';
export const DISPATCH_REPOSITORY = Symbol('DISPATCH_REPOSITORY');
export interface DispatchRepository {
  save(dispatch: Dispatch): Promise<void>;
  findById(dispatchId: string): Promise<Dispatch | null>;
  findByOrderId(orderId: string): Promise<Dispatch | null>;
  findAll(limit?: number): Promise<Dispatch[]>;
}
