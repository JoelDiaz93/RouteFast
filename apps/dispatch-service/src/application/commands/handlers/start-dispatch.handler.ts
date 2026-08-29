import { Inject } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Dispatch } from '../../../domain/entities/dispatch.aggregate';
import { DISPATCH_REPOSITORY, DispatchRepository } from '../../ports/dispatch.repository';
import { DISPATCH_WORKFLOW_TRANSACTION, DispatchWorkflowTransaction } from '../../ports/dispatch-workflow.transaction';
import { DispatchTimeoutScheduler } from '../../../infrastructure/jobs/dispatch-timeout.scheduler';
import { StartDispatchCommand } from '../start-dispatch.command';

@CommandHandler(StartDispatchCommand)
export class StartDispatchHandler implements ICommandHandler<StartDispatchCommand> {
  constructor(
    @Inject(DISPATCH_REPOSITORY) private readonly repository: DispatchRepository,
    @Inject(DISPATCH_WORKFLOW_TRANSACTION) private readonly workflow: DispatchWorkflowTransaction,
    private readonly timeoutScheduler: DispatchTimeoutScheduler,
  ) {}

  async execute(command: StartDispatchCommand): Promise<void> {
    const existing = await this.repository.findByOrderId(command.orderId);
    if (existing) return;
    const dispatch = Dispatch.start({ id: randomUUID(), orderId: command.orderId, correlationId: command.correlationId });
    await this.workflow.start(dispatch);
    await this.timeoutScheduler.schedule(dispatch.id, dispatch.correlationId);
  }
}
