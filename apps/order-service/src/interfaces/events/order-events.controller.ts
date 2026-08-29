import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { AssignOrderDriverUseCase } from '../../application/use-cases/assign-order-driver.use-case';
import { MarkDispatchFailedUseCase } from '../../application/use-cases/mark-dispatch-failed.use-case';
import { MarkOrderDispatchingUseCase } from '../../application/use-cases/mark-order-dispatching.use-case';

interface DispatchStartedEvent { orderId: string; dispatchId: string; correlationId: string; }
interface DispatchAssignedEvent extends DispatchStartedEvent { driverId: string; }
interface DispatchFailedEvent extends DispatchStartedEvent { reason: string; }

@Controller()
export class OrderEventsController {
  constructor(
    private readonly markDispatching: MarkOrderDispatchingUseCase,
    private readonly assignDriver: AssignOrderDriverUseCase,
    private readonly markFailed: MarkDispatchFailedUseCase,
  ) {}

  @EventPattern('dispatch.started.v1')
  async started(@Payload() event: DispatchStartedEvent, @Ctx() context: RmqContext): Promise<void> {
    await this.handle(context, () => this.markDispatching.execute(event.orderId));
  }

  @EventPattern('dispatch.assigned.v1')
  async assigned(@Payload() event: DispatchAssignedEvent, @Ctx() context: RmqContext): Promise<void> {
    await this.handle(context, () => this.assignDriver.execute(event.orderId, event.driverId));
  }

  @EventPattern('dispatch.failed.v1')
  async failed(@Payload() event: DispatchFailedEvent, @Ctx() context: RmqContext): Promise<void> {
    await this.handle(context, () => this.markFailed.execute(event.orderId, event.reason));
  }

  private async handle(context: RmqContext, operation: () => Promise<void>): Promise<void> {
    const channel = context.getChannelRef(); const message = context.getMessage();
    try { await operation(); channel.ack(message); }
    catch (error) { channel.nack(message, false, false); throw error; }
  }
}
