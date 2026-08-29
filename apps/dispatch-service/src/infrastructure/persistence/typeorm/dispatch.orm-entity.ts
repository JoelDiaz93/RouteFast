import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { DispatchStatus } from '../../../domain/entities/dispatch-status.enum';
@Entity({ name: 'dispatches' })
export class DispatchOrmEntity {
  @PrimaryColumn({ type: 'uuid' }) id!: string;
  @Index({ unique: true }) @Column({ name: 'order_id', type: 'uuid' }) orderId!: string;
  @Column({ name: 'driver_id', type: 'uuid', nullable: true }) driverId!: string | null;
  @Column({ type: 'enum', enum: DispatchStatus }) status!: DispatchStatus;
  @Column({ name: 'failure_reason', type: 'varchar', length: 120, nullable: true }) failureReason!: string | null;
  @Column({ name: 'correlation_id', type: 'varchar', length: 100 }) correlationId!: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
