import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DriverRepository } from '../../../application/ports/driver.repository';
import { Driver } from '../../../domain/entities/driver.aggregate';
import { DriverStatus } from '../../../domain/entities/driver-status.enum';
import { DriverMapper } from './driver.mapper';
import { DriverOrmEntity } from './driver.orm-entity';

@Injectable()
export class TypeOrmDriverRepository implements DriverRepository {
  constructor(@InjectRepository(DriverOrmEntity) private readonly repository: Repository<DriverOrmEntity>) {}

  async save(driver: Driver): Promise<void> {
    await this.repository.save(DriverMapper.toPersistence(driver));
  }

  async findById(driverId: string): Promise<Driver | null> {
    const entity = await this.repository.findOne({ where: { id: driverId } });
    return entity ? DriverMapper.toDomain(entity) : null;
  }

  async findAll(): Promise<Driver[]> {
    const entities = await this.repository.find({ order: { createdAt: 'DESC' } });
    return entities.map(DriverMapper.toDomain);
  }

  async findFirstAvailable(): Promise<Driver | null> {
    const entities = await this.repository.find({
      where: { status: DriverStatus.AVAILABLE },
      order: { createdAt: 'ASC' },
    });
    const candidates = entities.map(DriverMapper.toDomain);
    candidates.sort((a, b) => a.currentLoad - b.currentLoad || a.createdAt.getTime() - b.createdAt.getTime());
    return candidates[0] ?? null;
  }
}
