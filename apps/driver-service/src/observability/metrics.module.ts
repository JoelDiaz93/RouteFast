import {
  CallHandler,
  Controller,
  ExecutionContext,
  Get,
  Global,
  Header,
  Injectable,
  Module,
  NestInterceptor,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import type { Request, Response } from 'express';
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';
import type { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { trace } from '@opentelemetry/api';

function accessLogSampleRate(): number {
  const parsed = Number(process.env.HTTP_ACCESS_LOG_SAMPLE_RATE ?? '1');
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(Math.max(parsed, 0), 1);
}

function shouldWriteAccessLog(statusCode: number): boolean {
  if (statusCode >= 400) return true;
  const rate = accessLogSampleRate();
  if (rate <= 0) return false;
  if (rate >= 1) return true;
  return Math.random() < rate;
}

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();
  private readonly requests: Counter<'service' | 'method' | 'route' | 'status'>;
  private readonly duration: Histogram<'service' | 'method' | 'route' | 'status'>;
  private readonly buildInfo: Gauge<'service' | 'phase'>;

  constructor() {
    collectDefaultMetrics({ register: this.registry, prefix: 'routefast_process_' });
    this.requests = new Counter({
      name: 'routefast_http_requests_total',
      help: 'Total HTTP requests handled by RouteFast services',
      labelNames: ['service', 'method', 'route', 'status'],
      registers: [this.registry],
    });
    this.duration = new Histogram({
      name: 'routefast_http_request_duration_seconds',
      help: 'HTTP request latency in seconds',
      labelNames: ['service', 'method', 'route', 'status'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });
    this.buildInfo = new Gauge({
      name: 'routefast_build_info',
      help: 'Static build information for the running service',
      labelNames: ['service', 'phase'],
      registers: [this.registry],
    });
    this.buildInfo.set({ service: process.env.OTEL_SERVICE_NAME ?? 'unknown', phase: '6' }, 1);
  }

  observeHttp(service: string, method: string, route: string, status: string, durationSeconds: number): void {
    const labels = { service, method, route, status };
    this.requests.inc(labels);
    this.duration.observe(labels, durationSeconds);
  }

  contentType(): string { return this.registry.contentType; }
  render(): Promise<string> { return this.registry.metrics(); }
}

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const started = process.hrtime.bigint();
    return next.handle().pipe(finalize(() => {
      const elapsed = Number(process.hrtime.bigint() - started) / 1_000_000_000;
      const routePath = typeof request.route?.path === 'string' ? request.route.path : request.path;
      const service = process.env.OTEL_SERVICE_NAME ?? 'unknown';
      const status = String(response.statusCode);
      this.metrics.observeHttp(service, request.method, routePath, status, elapsed);
      const activeSpan = trace.getActiveSpan();
      const traceId = activeSpan?.spanContext().traceId;
      const correlationId = request.header('x-correlation-id');
      if (shouldWriteAccessLog(response.statusCode)) {

        process.stdout.write(`${JSON.stringify({

          timestamp: new Date().toISOString(),

          level: 'info',

          service,

          event: 'http.request.completed',

          method: request.method,

          route: routePath,

          statusCode: response.statusCode,

          durationMs: Number((elapsed * 1000).toFixed(2)),

          correlationId,

          traceId,

          accessLogSampleRate: accessLogSampleRate(),

        })}\n`);

      }
    }));
  }
}

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}
  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  metricsText(): Promise<string> { return this.metrics.render(); }
}

@Global()
@Module({
  controllers: [MetricsController],
  providers: [MetricsService, { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor }],
  exports: [MetricsService],
})
export class MetricsModule {}
