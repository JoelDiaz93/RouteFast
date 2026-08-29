import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { AssignOrderDriverUseCase } from '../../application/use-cases/assign-order-driver.use-case';
import { CompleteDispatchCancellationUseCase } from '../../application/use-cases/complete-dispatch-cancellation.use-case';
import { MarkDispatchFailedUseCase } from '../../application/use-cases/mark-dispatch-failed.use-case';
import { MarkOrderDispatchingUseCase } from '../../application/use-cases/mark-order-dispatching.use-case';
import { RmqReliabilityService } from '../../infrastructure/reliability/rmq-reliability.service';

interface BaseEvent { eventId: string; orderId: string; dispatchId: string; correlationId: string; }
interface DispatchAssignedEvent extends BaseEvent { driverId: string; }
interface DispatchFailedEvent extends BaseEvent { reason: string; }

@Controller()
export class OrderEventsController {
  private readonly queue = process.env.ORDER_EVENTS_QUEUE ?? 'routefast.order.events';

  constructor(
    private readonly markDispatching: MarkOrderDispatchingUseCase,
    private readonly assignDriver: AssignOrderDriverUseCase,
    private readonly markFailed: MarkDispatchFailedUseCase,
    private readonly completeCancellation: CompleteDispatchCancellationUseCase,
    private readonly reliability: RmqReliabilityService,
  ) {}

  @EventPattern('dispatch.started.v1')
  started(@Payload() event: BaseEvent, @Ctx() context: RmqContext): Promise<void> {
    return this.reliability.handle(this.queue, 'dispatch.started.v1', event, context, () => this.markDispatching.execute(event.orderId));
  }

  @EventPattern('dispatch.assigned.v1')
  assigned(@Payload() event: DispatchAssignedEvent, @Ctx() context: RmqContext): Promise<void> {
    return this.reliability.handle(this.queue, 'dispatch.assigned.v1', event, context, () => this.assignDriver.execute(event.orderId, event.driverId));
  }

  @EventPattern('dispatch.failed.v1')
  failed(@Payload() event: DispatchFailedEvent, @Ctx() context: RmqContext): Promise<void> {
    return this.reliability.handle(this.queue, 'dispatch.failed.v1', event, context, () => this.markFailed.execute(event.orderId, event.reason));
  }

  @EventPattern('dispatch.cancelled.v1')
  cancelled(@Payload() event: BaseEvent, @Ctx() context: RmqContext): Promise<void> {
    return this.reliability.handle(this.queue, 'dispatch.cancelled.v1', event, context, () => this.completeCancellation.execute(event.orderId));
  }
}
