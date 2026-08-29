import { Controller } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { CompleteDriverReservationCommand } from '../../application/commands/complete-driver-reservation.command';
import { StartDispatchCommand } from '../../application/commands/start-dispatch.command';

interface OrderReadyEvent { orderId: string; correlationId: string; }
interface DriverReservedEvent { orderId: string; dispatchId: string; driverId: string; correlationId: string; }
interface DriverReservationFailedEvent { orderId: string; dispatchId: string; reason: string; correlationId: string; }

@Controller()
export class DispatchEventsController {
  constructor(private readonly commandBus: CommandBus) {}

  @EventPattern('order.ready_for_dispatch.v1')
  async orderReady(@Payload() event: OrderReadyEvent, @Ctx() context: RmqContext): Promise<void> {
    await this.handle(context, () => this.commandBus.execute(new StartDispatchCommand(event.orderId, event.correlationId)));
  }

  @EventPattern('driver.reserved.v1')
  async driverReserved(@Payload() event: DriverReservedEvent, @Ctx() context: RmqContext): Promise<void> {
    await this.handle(context, () => this.commandBus.execute(new CompleteDriverReservationCommand(event.dispatchId, event.orderId, event.driverId, null, event.correlationId)));
  }

  @EventPattern('driver.reservation_failed.v1')
  async driverReservationFailed(@Payload() event: DriverReservationFailedEvent, @Ctx() context: RmqContext): Promise<void> {
    await this.handle(context, () => this.commandBus.execute(new CompleteDriverReservationCommand(event.dispatchId, event.orderId, null, event.reason, event.correlationId)));
  }

  private async handle(context: RmqContext, operation: () => Promise<unknown>): Promise<void> {
    const channel = context.getChannelRef(); const message = context.getMessage();
    try { await operation(); channel.ack(message); }
    catch (error) { channel.nack(message, false, false); throw error; }
  }
}
