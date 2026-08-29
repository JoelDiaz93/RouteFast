import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { DriverStatus } from '../../../domain/entities/driver-status.enum';
@Entity({ name: 'drivers' })
export class DriverOrmEntity {
  @PrimaryColumn({ type: 'uuid' }) id!: string;
  @Column({ name: 'display_name', type: 'varchar', length: 120 }) displayName!: string;
  @Column({ type: 'int' }) capacity!: number;
  @Column({ name: 'reserved_order_ids', type: 'jsonb', default: () => "'[]'::jsonb" }) reservedOrderIds!: string[];
  @Column({ type: 'enum', enum: DriverStatus }) status!: DriverStatus;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
