export class StartDispatchCommand {
  constructor(
    public readonly orderId: string,
    public readonly correlationId: string,
  ) {}
}
