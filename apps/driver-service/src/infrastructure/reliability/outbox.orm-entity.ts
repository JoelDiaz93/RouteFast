import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export enum OutboxStatus {
  PENDING = 'PENDING',
  PUBLISHED = 'PUBLISHED',
}

@Entity({ name: 'outbox_events' })
export class OutboxOrmEntity {
  @PrimaryColumn({ type: 'uuid' }) id!: string;
  @Index() @Column({ name: 'event_type', type: 'varchar', length: 160 }) eventType!: string;
  @Column({ name: 'target_queue', type: 'varchar', length: 160 }) targetQueue!: string;
  @Column({ type: 'jsonb' }) payload!: Record<string, unknown>;
  @Index() @Column({ type: 'enum', enum: OutboxStatus, default: OutboxStatus.PENDING }) status!: OutboxStatus;
  @Column({ type: 'int', default: 0 }) attempts!: number;
  @Column({ name: 'correlation_id', type: 'varchar', length: 120 }) correlationId!: string;
  @Column({ name: 'available_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' }) availableAt!: Date;
  @Column({ name: 'published_at', type: 'timestamptz', nullable: true }) publishedAt!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
