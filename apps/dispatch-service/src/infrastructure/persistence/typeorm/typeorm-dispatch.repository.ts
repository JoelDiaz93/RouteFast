import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DispatchRepository } from '../../../application/ports/dispatch.repository';
import { Dispatch } from '../../../domain/entities/dispatch.aggregate';
import { DispatchMapper } from './dispatch.mapper';
import { DispatchOrmEntity } from './dispatch.orm-entity';
@Injectable()
export class TypeOrmDispatchRepository implements DispatchRepository {
  constructor(@InjectRepository(DispatchOrmEntity) private readonly repository: Repository<DispatchOrmEntity>) {}
  async save(dispatch: Dispatch): Promise<void> { await this.repository.save(DispatchMapper.toPersistence(dispatch)); }
  async findById(dispatchId: string): Promise<Dispatch | null> {
    const entity = await this.repository.findOne({ where: { id: dispatchId } }); return entity ? DispatchMapper.toDomain(entity) : null;
  }
  async findByOrderId(orderId: string): Promise<Dispatch | null> {
    const entity = await this.repository.findOne({ where: { orderId } }); return entity ? DispatchMapper.toDomain(entity) : null;
  }
  async findAll(limit = 100): Promise<Dispatch[]> {
    return (await this.repository.find({
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 500),
    })).map(DispatchMapper.toDomain);
  }
}
