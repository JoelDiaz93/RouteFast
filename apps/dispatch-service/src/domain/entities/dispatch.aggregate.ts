import { DispatchStatus } from './dispatch-status.enum';

export interface DispatchProps {
  id: string;
  orderId: string;
  driverId: string | null;
  status: DispatchStatus;
  failureReason: string | null;
  correlationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Dispatch {
  private constructor(private readonly props: DispatchProps) {}

  static start(input: { id: string; orderId: string; correlationId: string; now?: Date }): Dispatch {
    const now = input.now ?? new Date();
    return new Dispatch({
      id: input.id,
      orderId: input.orderId,
      driverId: null,
      status: DispatchStatus.SEARCHING_DRIVER,
      failureReason: null,
      correlationId: input.correlationId,
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(props: DispatchProps): Dispatch { return new Dispatch(props); }

  assign(driverId: string, now = new Date()): void {
    if (this.props.status !== DispatchStatus.SEARCHING_DRIVER) return;
    this.props.driverId = driverId;
    this.props.status = DispatchStatus.ASSIGNED;
    this.props.updatedAt = now;
  }


  startCompensation(reason: string, now = new Date()): void {
    if (this.props.status === DispatchStatus.COMPENSATING || this.props.status === DispatchStatus.CANCELLED) return;
    if (this.props.status !== DispatchStatus.ASSIGNED || !this.props.driverId) {
      throw new Error(`Dispatch ${this.props.id} cannot compensate from ${this.props.status}`);
    }
    this.props.status = DispatchStatus.COMPENSATING;
    this.props.failureReason = reason;
    this.props.updatedAt = now;
  }

  completeCompensation(now = new Date()): void {
    if (this.props.status === DispatchStatus.CANCELLED) return;
    if (this.props.status !== DispatchStatus.COMPENSATING) return;
    this.props.status = DispatchStatus.CANCELLED;
    this.props.updatedAt = now;
  }

  fail(reason: string, now = new Date()): void {
    if (this.props.status !== DispatchStatus.SEARCHING_DRIVER) return;
    this.props.status = DispatchStatus.FAILED;
    this.props.failureReason = reason;
    this.props.updatedAt = now;
  }

  get id(): string { return this.props.id; }
  get orderId(): string { return this.props.orderId; }
  get driverId(): string | null { return this.props.driverId; }
  get status(): DispatchStatus { return this.props.status; }
  get failureReason(): string | null { return this.props.failureReason; }
  get correlationId(): string { return this.props.correlationId; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
}
