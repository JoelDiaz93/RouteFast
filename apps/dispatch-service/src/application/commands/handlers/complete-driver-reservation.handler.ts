import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DISPATCH_EVENT_PUBLISHER, DispatchEventPublisher } from '../../ports/dispatch-event.publisher';
import { DISPATCH_REPOSITORY, DispatchRepository } from '../../ports/dispatch.repository';
import { DispatchStatus } from '../../../domain/entities/dispatch-status.enum';
import { CompleteDriverReservationCommand } from '../complete-driver-reservation.command';

@CommandHandler(CompleteDriverReservationCommand)
export class CompleteDriverReservationHandler implements ICommandHandler<CompleteDriverReservationCommand> {
  constructor(
    @Inject(DISPATCH_REPOSITORY) private readonly repository: DispatchRepository,
    @Inject(DISPATCH_EVENT_PUBLISHER) private readonly publisher: DispatchEventPublisher,
  ) {}

  async execute(command: CompleteDriverReservationCommand): Promise<void> {
    const dispatch = await this.repository.findById(command.dispatchId);
    if (!dispatch) throw new Error(`Dispatch ${command.dispatchId} not found`);
    if (dispatch.status !== DispatchStatus.SEARCHING_DRIVER) return;
    if (command.driverId) {
      dispatch.assign(command.driverId);
      await this.repository.save(dispatch);
      await this.publisher.dispatchAssigned({ dispatchId: dispatch.id, orderId: dispatch.orderId, driverId: command.driverId, correlationId: command.correlationId });
      return;
    }
    const reason = command.reason ?? 'DRIVER_RESERVATION_FAILED';
    dispatch.fail(reason);
    await this.repository.save(dispatch);
    await this.publisher.dispatchFailed({ dispatchId: dispatch.id, orderId: dispatch.orderId, reason, correlationId: command.correlationId });
  }
}
