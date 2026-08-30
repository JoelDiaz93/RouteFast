import { Controller } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { CompleteCompensationCommand } from '../../application/commands/complete-compensation.command';
import { CompleteDriverReservationCommand } from '../../application/commands/complete-driver-reservation.command';
import { StartDispatchCommand } from '../../application/commands/start-dispatch.command';
import { RmqReliabilityService } from '../../infrastructure/reliability/rmq-reliability.service';

interface OrderReadyEvent {
  eventId: string;
  orderId: string;
  correlationId: string;
  priority?: string;
  pickup?: { latitude: number; longitude: number };
}
interface DriverReservedEvent {
  eventId: string;
  orderId: string;
  dispatchId: string;
  driverId: string;
  correlationId: string;
}
interface DriverReservationFailedEvent {
  eventId: string;
  orderId: string;
  dispatchId: string;
  reason: string;
  correlationId: string;
}
interface DriverReleasedEvent extends DriverReservedEvent {}

@Controller()
export class DispatchEventsController {
  private readonly queue = process.env.DISPATCH_EVENTS_QUEUE ?? 'routefast.dispatch.events';

  constructor(
    private readonly commandBus: CommandBus,
    private readonly reliability: RmqReliabilityService,
  ) {}

  @EventPattern('order.ready_for_dispatch.v1')
  orderReady(@Payload() event: OrderReadyEvent, @Ctx() context: RmqContext): Promise<void> {
    return this.reliability.handle(this.queue, 'order.ready_for_dispatch.v1', event, context, () =>
      this.commandBus.execute(new StartDispatchCommand(event.orderId, event.correlationId, event.priority ?? 'STANDARD', event.pickup ?? null)),
    );
  }

  @EventPattern('driver.reserved.v1')
  driverReserved(@Payload() event: DriverReservedEvent, @Ctx() context: RmqContext): Promise<void> {
    return this.reliability.handle(this.queue, 'driver.reserved.v1', event, context, () =>
      this.commandBus.execute(
        new CompleteDriverReservationCommand(
          event.dispatchId,
          event.orderId,
          event.driverId,
          null,
          event.correlationId,
        ),
      ),
    );
  }

  @EventPattern('driver.reservation_failed.v1')
  driverReservationFailed(
    @Payload() event: DriverReservationFailedEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    return this.reliability.handle(this.queue, 'driver.reservation_failed.v1', event, context, () =>
      this.commandBus.execute(
        new CompleteDriverReservationCommand(
          event.dispatchId,
          event.orderId,
          null,
          event.reason,
          event.correlationId,
        ),
      ),
    );
  }

  @EventPattern('driver.released.v1')
  driverReleased(@Payload() event: DriverReleasedEvent, @Ctx() context: RmqContext): Promise<void> {
    return this.reliability.handle(this.queue, 'driver.released.v1', event, context, () =>
      this.commandBus.execute(new CompleteCompensationCommand(event.dispatchId, event.correlationId)),
    );
  }
}
