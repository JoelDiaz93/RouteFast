import { DriverUnavailableError } from '../errors/driver-unavailable.error';
import { DriverStatus } from './driver-status.enum';

export interface DriverProps {
  id: string;
  displayName: string;
  capacity: number;
  reservedOrderIds: string[];
  status: DriverStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class Driver {
  private constructor(private readonly props: DriverProps) {}

  static create(input: { id: string; displayName: string; capacity: number; now?: Date }): Driver {
    const displayName = input.displayName.trim();
    if (!displayName) throw new Error('displayName is required');
    if (!Number.isInteger(input.capacity) || input.capacity < 1) throw new Error('capacity must be a positive integer');
    const now = input.now ?? new Date();
    return new Driver({ id: input.id, displayName, capacity: input.capacity, reservedOrderIds: [], status: DriverStatus.AVAILABLE, createdAt: now, updatedAt: now });
  }

  static rehydrate(props: DriverProps): Driver { return new Driver({ ...props, reservedOrderIds: [...props.reservedOrderIds] }); }

  reserve(orderId: string, now = new Date()): void {
    if (this.props.status === DriverStatus.OFFLINE) throw new DriverUnavailableError(`Driver ${this.props.id} is offline`);
    if (this.props.reservedOrderIds.includes(orderId)) return;
    if (this.props.reservedOrderIds.length >= this.props.capacity) throw new DriverUnavailableError(`Driver ${this.props.id} has no remaining capacity`);
    this.props.reservedOrderIds.push(orderId);
    this.props.status = this.props.reservedOrderIds.length >= this.props.capacity ? DriverStatus.RESERVED : DriverStatus.AVAILABLE;
    this.props.updatedAt = now;
  }

  release(orderId: string, now = new Date()): void {
    const index = this.props.reservedOrderIds.indexOf(orderId);
    if (index < 0) return;
    this.props.reservedOrderIds.splice(index, 1);
    this.props.status = DriverStatus.AVAILABLE;
    this.props.updatedAt = now;
  }

  setOffline(now = new Date()): void {
    if (this.props.reservedOrderIds.length > 0) throw new DriverUnavailableError('Driver with active reservations cannot be set offline');
    this.props.status = DriverStatus.OFFLINE;
    this.props.updatedAt = now;
  }

  setAvailable(now = new Date()): void {
    if (this.props.reservedOrderIds.length > 0) throw new DriverUnavailableError('Driver with active reservations cannot be manually changed');
    this.props.status = DriverStatus.AVAILABLE;
    this.props.updatedAt = now;
  }

  get id(): string { return this.props.id; }
  get displayName(): string { return this.props.displayName; }
  get capacity(): number { return this.props.capacity; }
  get currentLoad(): number { return this.props.reservedOrderIds.length; }
  get reservedOrderIds(): readonly string[] { return [...this.props.reservedOrderIds]; }
  get status(): DriverStatus { return this.props.status; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
}
