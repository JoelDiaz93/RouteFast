import { UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UpdateDriverLocationUseCase } from '../../application/use-cases/update-driver-location.use-case';
import { UpdateDriverLocationDto } from '../http/dto/update-driver-location.dto';
import { MetricsService } from '../../observability/metrics.module';

@WebSocketGateway({ namespace: '/tracking', cors: { origin: '*' } })
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() private server!: Server;

  constructor(private readonly updateLocation: UpdateDriverLocationUseCase, private readonly metrics: MetricsService) {}

  handleConnection(client: Socket): void {
    client.emit('tracking.connected', { socketId: client.id });
  }

  handleDisconnect(): void {}

  @SubscribeMessage('tracking.subscribe')
  subscribe(@ConnectedSocket() client: Socket, @MessageBody() body: { driverId?: string; operations?: boolean }) {
    if (body.operations) void client.join('operations');
    if (body.driverId) void client.join(`driver:${body.driverId}`);
    return { subscribed: true, driverId: body.driverId ?? null, operations: Boolean(body.operations) };
  }

  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  @SubscribeMessage('driver.location.update')
  async update(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: UpdateDriverLocationDto,
  ) {
    const result = await this.updateLocation.execute(body);
    this.metrics.observeLocationUpdate('websocket', result.acceptedAsCurrent);
    void client.join(`driver:${body.driverId}`);
    if (result.acceptedAsCurrent) {
      this.server.to(`driver:${body.driverId}`).emit('driver.location.updated', result.location);
      this.server.to('operations').emit('driver.location.updated', result.location);
    }
    return { accepted: true, ...result };
  }
}
