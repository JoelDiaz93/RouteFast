import { Order } from '../../domain/entities/order.aggregate';

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');

export interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(orderId: string): Promise<Order | null>;
  findAll(): Promise<Order[]>;
}
