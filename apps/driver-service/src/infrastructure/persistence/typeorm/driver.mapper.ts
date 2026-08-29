import { Driver } from '../../../domain/entities/driver.aggregate';
import { DriverOrmEntity } from './driver.orm-entity';
export class DriverMapper {
  static toPersistence(driver: Driver): DriverOrmEntity {
    const entity = new DriverOrmEntity(); entity.id=driver.id; entity.displayName=driver.displayName; entity.capacity=driver.capacity;
    entity.reservedOrderIds=[...driver.reservedOrderIds]; entity.status=driver.status; entity.createdAt=driver.createdAt; entity.updatedAt=driver.updatedAt; return entity;
  }
  static toDomain(entity: DriverOrmEntity): Driver {
    return Driver.rehydrate({ id:entity.id, displayName:entity.displayName, capacity:entity.capacity, reservedOrderIds:entity.reservedOrderIds ?? [], status:entity.status, createdAt:entity.createdAt, updatedAt:entity.updatedAt });
  }
}
