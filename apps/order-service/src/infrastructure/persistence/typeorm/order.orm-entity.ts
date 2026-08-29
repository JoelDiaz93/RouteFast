import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderPriority } from '../../../domain/entities/order-priority.enum';
import { OrderStatus } from '../../../domain/entities/order-status.enum';

export interface StoredLocation {
  label: string;
  address: string;
  latitude: number;
  longitude: number;
}

@Entity({ name: 'orders' })
export class OrderOrmEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 100 })
  customerId!: string;

  @Column({ type: 'enum', enum: OrderPriority })
  priority!: OrderPriority;

  @Column({ type: 'enum', enum: OrderStatus })
  status!: OrderStatus;

  @Column({ type: 'jsonb' })
  pickup!: StoredLocation;

  @Column({ type: 'jsonb' })
  dropoff!: StoredLocation;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
