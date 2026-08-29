import { Inject } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Dispatch } from '../../../domain/entities/dispatch.aggregate';
import { DISPATCH_EVENT_PUBLISHER, DispatchEventPublisher } from '../../ports/dispatch-event.publisher';
import { DISPATCH_REPOSITORY, DispatchRepository } from '../../ports/dispatch.repository';
import { StartDispatchCommand } from '../start-dispatch.command';

@CommandHandler(StartDispatchCommand)
export class StartDispatchHandler implements ICommandHandler<StartDispatchCommand> {
  constructor(
    @Inject(DISPATCH_REPOSITORY) private readonly repository: DispatchRepository,
    @Inject(DISPATCH_EVENT_PUBLISHER) private readonly publisher: DispatchEventPublisher,
  ) {}

  async execute(command: StartDispatchCommand): Promise<void> {
    const existing = await this.repository.findByOrderId(command.orderId);
    if (existing) return;
    const dispatch = Dispatch.start({ id: randomUUID(), orderId: command.orderId, correlationId: command.correlationId });
    await this.repository.save(dispatch);
    await this.publisher.dispatchStarted({ dispatchId: dispatch.id, orderId: dispatch.orderId, correlationId: dispatch.correlationId });
    await this.publisher.requestDriverReservation({ dispatchId: dispatch.id, orderId: dispatch.orderId, correlationId: dispatch.correlationId });
  }
}
