import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export enum InboxStatus {
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
}

@Entity({ name: 'inbox_events' })
export class InboxOrmEntity {
  @PrimaryColumn({ name: 'event_id', type: 'uuid' }) eventId!: string;
  @Index() @Column({ name: 'event_type', type: 'varchar', length: 160 }) eventType!: string;
  @Column({ name: 'correlation_id', type: 'varchar', length: 120 }) correlationId!: string;
  @Column({ type: 'enum', enum: InboxStatus, default: InboxStatus.PROCESSING }) status!: InboxStatus;
  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true }) processedAt!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
