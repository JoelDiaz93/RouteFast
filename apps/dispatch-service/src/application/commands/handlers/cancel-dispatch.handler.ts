import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DISPATCH_WORKFLOW_TRANSACTION, DispatchWorkflowTransaction } from '../../ports/dispatch-workflow.transaction';
import { CancelDispatchCommand } from '../cancel-dispatch.command';

@CommandHandler(CancelDispatchCommand)
export class CancelDispatchHandler implements ICommandHandler<CancelDispatchCommand> {
  constructor(@Inject(DISPATCH_WORKFLOW_TRANSACTION) private readonly workflow: DispatchWorkflowTransaction) {}
  execute(command: CancelDispatchCommand): Promise<void> {
    return this.workflow.startCompensation(command.dispatchId, command.reason, command.correlationId);
  }
}
