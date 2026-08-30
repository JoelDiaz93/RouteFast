export class StartDispatchCommand {
  constructor(
    public readonly orderId: string,
    public readonly correlationId: string,
    public readonly priority: string = 'STANDARD',
    public readonly pickup: { latitude: number; longitude: number } | null = null,
  ) {}
}
