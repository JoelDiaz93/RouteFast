import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

export enum DriverReservationStatus {
  ACTIVE = 'ACTIVE',
  RELEASED = 'RELEASED',
}

@Entity({ name: 'driver_reservations' })
export class DriverReservationOrmEntity {
  @PrimaryColumn({ type: 'uuid' }) id!: string;
  @Index({ unique: true }) @Column({ name: 'order_id', type: 'uuid' }) orderId!: string;
  @Index() @Column({ name: 'dispatch_id', type: 'uuid' }) dispatchId!: string;
  @Index() @Column({ name: 'driver_id', type: 'uuid' }) driverId!: string;
  @Column({ type: 'enum', enum: DriverReservationStatus, default: DriverReservationStatus.ACTIVE }) status!: DriverReservationStatus;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @Column({ name: 'released_at', type: 'timestamptz', nullable: true }) releasedAt!: Date | null;
}
