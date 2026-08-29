import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DISPATCH_WORKFLOW_TRANSACTION, DispatchWorkflowTransaction } from '../../ports/dispatch-workflow.transaction';
import { CompleteDriverReservationCommand } from '../complete-driver-reservation.command';

@CommandHandler(CompleteDriverReservationCommand)
export class CompleteDriverReservationHandler implements ICommandHandler<CompleteDriverReservationCommand> {
  constructor(@Inject(DISPATCH_WORKFLOW_TRANSACTION) private readonly workflow: DispatchWorkflowTransaction) {}

  execute(command: CompleteDriverReservationCommand): Promise<void> {
    return this.workflow.completeReservation({
      dispatchId: command.dispatchId,
      orderId: command.orderId,
      driverId: command.driverId,
      reason: command.reason,
      correlationId: command.correlationId,
    });
  }
}
