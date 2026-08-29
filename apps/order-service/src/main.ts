import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [config.get<string>('RABBITMQ_URL', 'amqp://routefast:routefast@localhost:5672')],
      queue: config.get<string>('ORDER_EVENTS_QUEUE', 'routefast.order.events'),
      queueOptions: { durable: true },
      noAck: false,
      prefetchCount: 8,
    },
  });
  await app.startAllMicroservices();
  await app.listen(config.get<number>('ORDER_SERVICE_PORT', 3001));
}
void bootstrap();
