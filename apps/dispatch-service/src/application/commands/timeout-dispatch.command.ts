export class TimeoutDispatchCommand {
  constructor(public readonly dispatchId: string, public readonly correlationId: string) {}
}
