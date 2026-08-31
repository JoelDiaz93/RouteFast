import './observability/instrumentation';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { StructuredLogger } from './observability/structured-logger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: new StructuredLogger('api-gateway') });
  const config = app.get(ConfigService);

  const opsConsoleOrigins = config
    .get<string>('OPS_CONSOLE_ORIGIN', 'http://localhost:5173,http://localhost:4173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: opsConsoleOrigins.includes('*') ? true : opsConsoleOrigins,
    exposedHeaders: ['x-correlation-id'],
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = config.get<number>('API_GATEWAY_PORT', 3000);
  await app.listen(port);
}

void bootstrap();
