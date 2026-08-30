import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { ReleaseDriverReservationUseCase } from '../../application/use-cases/release-driver-reservation.use-case';
import { ReserveDriverUseCase } from '../../application/use-cases/reserve-driver.use-case';
import { RmqReliabilityService } from '../../infrastructure/reliability/rmq-reliability.service';

interface ReservationRequestedEvent {
  eventId: string;
  orderId: string;
  dispatchId: string;
  correlationId: string;
  candidateDriverIds?: string[];
}

interface ReleaseRequestedEvent extends ReservationRequestedEvent {
  driverId: string;
}

@Controller()
export class DriverEventsController {
  private readonly queue = process.env.DRIVER_EVENTS_QUEUE ?? 'routefast.driver.events';

  constructor(
    private readonly reserveDriver: ReserveDriverUseCase,
    private readonly releaseDriver: ReleaseDriverReservationUseCase,
    private readonly reliability: RmqReliabilityService,
  ) {}

  @EventPattern('driver.reservation_requested.v1')
  reserve(@Payload() event: ReservationRequestedEvent, @Ctx() context: RmqContext): Promise<void> {
    return this.reliability.handle(this.queue, 'driver.reservation_requested.v1', event, context, () => this.reserveDriver.execute(event));
  }

  @EventPattern('driver.release_requested.v1')
  release(@Payload() event: ReleaseRequestedEvent, @Ctx() context: RmqContext): Promise<void> {
    return this.reliability.handle(this.queue, 'driver.release_requested.v1', event, context, () => this.releaseDriver.execute(event));
  }
}
