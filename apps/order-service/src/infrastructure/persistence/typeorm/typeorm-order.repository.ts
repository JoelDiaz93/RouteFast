import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderRepository } from '../../../application/ports/order.repository';
import { Order } from '../../../domain/entities/order.aggregate';
import { OrderMapper } from './order.mapper';
import { OrderOrmEntity } from './order.orm-entity';

@Injectable()
export class TypeOrmOrderRepository implements OrderRepository {
  constructor(
    @InjectRepository(OrderOrmEntity)
    private readonly repository: Repository<OrderOrmEntity>,
  ) {}

  async save(order: Order): Promise<void> {
    await this.repository.save(OrderMapper.toPersistence(order));
  }

  async findById(orderId: string): Promise<Order | null> {
    const entity = await this.repository.findOne({ where: { id: orderId } });
    return entity ? OrderMapper.toDomain(entity) : null;
  }

  async findAll(limit = 100): Promise<Order[]> {
    const entities = await this.repository.find({
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 500),
    });
    return entities.map(OrderMapper.toDomain);
  }
}
