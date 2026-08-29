import { Order } from '../../domain/entities/order.aggregate';

export const ORDER_EVENT_PUBLISHER = Symbol('ORDER_EVENT_PUBLISHER');

export interface OrderEventPublisher {
  readyForDispatch(order: Order, correlationId: string): Promise<void>;
}
