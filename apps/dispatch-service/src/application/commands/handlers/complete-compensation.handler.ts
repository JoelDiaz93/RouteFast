import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DISPATCH_WORKFLOW_TRANSACTION, DispatchWorkflowTransaction } from '../../ports/dispatch-workflow.transaction';
import { CompleteCompensationCommand } from '../complete-compensation.command';

@CommandHandler(CompleteCompensationCommand)
export class CompleteCompensationHandler implements ICommandHandler<CompleteCompensationCommand> {
  constructor(@Inject(DISPATCH_WORKFLOW_TRANSACTION) private readonly workflow: DispatchWorkflowTransaction) {}
  execute(command: CompleteCompensationCommand): Promise<void> {
    return this.workflow.completeCompensation(command.dispatchId, command.correlationId);
  }
}
