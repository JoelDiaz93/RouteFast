import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { ReserveDriverUseCase } from '../../application/use-cases/reserve-driver.use-case';

interface ReservationRequestedEvent {
  orderId: string;
  dispatchId: string;
  correlationId: string;
}

@Controller()
export class DriverEventsController {
  constructor(private readonly reserveDriver: ReserveDriverUseCase) {}

  @EventPattern('driver.reservation_requested.v1')
  async reserve(@Payload() event: ReservationRequestedEvent, @Ctx() context: RmqContext): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    try {
      await this.reserveDriver.execute(event);
      channel.ack(message);
    } catch (error) {
      channel.nack(message, false, false);
      throw error;
    }
  }
}
