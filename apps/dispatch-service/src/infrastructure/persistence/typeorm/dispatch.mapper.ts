import { Dispatch } from '../../../domain/entities/dispatch.aggregate';
import { DispatchOrmEntity } from './dispatch.orm-entity';
export class DispatchMapper {
  static toPersistence(dispatch: Dispatch): DispatchOrmEntity {
    const entity = new DispatchOrmEntity();
    entity.id = dispatch.id; entity.orderId = dispatch.orderId; entity.driverId = dispatch.driverId; entity.status = dispatch.status;
    entity.failureReason = dispatch.failureReason; entity.correlationId = dispatch.correlationId; entity.createdAt = dispatch.createdAt; entity.updatedAt = dispatch.updatedAt;
    return entity;
  }
  static toDomain(entity: DispatchOrmEntity): Dispatch {
    return Dispatch.rehydrate({ id: entity.id, orderId: entity.orderId, driverId: entity.driverId, status: entity.status,
      failureReason: entity.failureReason, correlationId: entity.correlationId, createdAt: entity.createdAt, updatedAt: entity.updatedAt });
  }
}
