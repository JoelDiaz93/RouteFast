import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DISPATCH_WORKFLOW_TRANSACTION, DispatchWorkflowTransaction } from '../../ports/dispatch-workflow.transaction';
import { TimeoutDispatchCommand } from '../timeout-dispatch.command';

@CommandHandler(TimeoutDispatchCommand)
export class TimeoutDispatchHandler implements ICommandHandler<TimeoutDispatchCommand> {
  constructor(@Inject(DISPATCH_WORKFLOW_TRANSACTION) private readonly workflow: DispatchWorkflowTransaction) {}
  execute(command: TimeoutDispatchCommand): Promise<void> {
    return this.workflow.timeout(command.dispatchId, command.correlationId);
  }
}
