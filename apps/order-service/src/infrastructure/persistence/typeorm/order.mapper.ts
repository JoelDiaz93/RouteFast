import { Order } from '../../../domain/entities/order.aggregate';
import { Location } from '../../../domain/value-objects/location.vo';
import { OrderOrmEntity } from './order.orm-entity';
export class OrderMapper {
  static toPersistence(order: Order): OrderOrmEntity {
    const entity = new OrderOrmEntity();
    entity.id = order.id; entity.customerId = order.customerId; entity.priority = order.priority; entity.status = order.status;
    entity.assignedDriverId = order.assignedDriverId; entity.lastDispatchFailureReason = order.lastDispatchFailureReason;
    entity.pickup = { label: order.pickup.label, address: order.pickup.address, latitude: order.pickup.coordinates.latitude, longitude: order.pickup.coordinates.longitude };
    entity.dropoff = { label: order.dropoff.label, address: order.dropoff.address, latitude: order.dropoff.coordinates.latitude, longitude: order.dropoff.coordinates.longitude };
    entity.createdAt = order.createdAt; entity.updatedAt = order.updatedAt; return entity;
  }
  static toDomain(entity: OrderOrmEntity): Order {
    return Order.rehydrate({
      id: entity.id, customerId: entity.customerId, priority: entity.priority, status: entity.status,
      assignedDriverId: entity.assignedDriverId, lastDispatchFailureReason: entity.lastDispatchFailureReason,
      pickup: Location.create(entity.pickup), dropoff: Location.create(entity.dropoff), createdAt: entity.createdAt, updatedAt: entity.updatedAt,
    });
  }
}
