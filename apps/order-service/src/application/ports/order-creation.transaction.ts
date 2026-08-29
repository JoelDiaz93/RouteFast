import { Order } from '../../domain/entities/order.aggregate';

export const ORDER_CREATION_TRANSACTION = Symbol('ORDER_CREATION_TRANSACTION');

export interface OrderCreationTransaction {
  persistReadyForDispatch(order: Order, correlationId: string, idempotencyKey?: string): Promise<Order>;
}
