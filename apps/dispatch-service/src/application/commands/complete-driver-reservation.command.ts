export class CompleteDriverReservationCommand {
  constructor(
    public readonly dispatchId: string,
    public readonly orderId: string,
    public readonly driverId: string | null,
    public readonly reason: string | null,
    public readonly correlationId: string,
  ) {}
}
