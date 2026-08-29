export class CompleteCompensationCommand {
  constructor(public readonly dispatchId: string, public readonly correlationId: string) {}
}
