export class CancelDispatchCommand {
  constructor(
    public readonly dispatchId: string,
    public readonly reason: string,
    public readonly correlationId: string,
  ) {}
}
