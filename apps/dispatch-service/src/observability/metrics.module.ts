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
import type { CircuitBreakerState, CircuitCallOutcome } from '../infrastructure/resilience/circuit-breaker';

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();
  private readonly requests: Counter<'service' | 'method' | 'route' | 'status'>;
  private readonly duration: Histogram<'service' | 'method' | 'route' | 'status'>;
  private readonly buildInfo: Gauge<'service' | 'phase'>;
  private readonly dependencyCalls: Counter<'service' | 'dependency' | 'outcome'>;
  private readonly dependencyDuration: Histogram<'service' | 'dependency'>;
  private readonly circuitState: Gauge<'service' | 'dependency'>;
  private readonly circuitTransitions: Counter<'service' | 'dependency' | 'from' | 'to'>;
  private readonly routeOptimizationDuration: Histogram<'service'>;
  private readonly routeOptimizationOrders: Histogram<'service'>;

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
    this.dependencyCalls = new Counter({
      name: 'routefast_dependency_calls_total',
      help: 'Outbound dependency calls grouped by circuit-breaker outcome',
      labelNames: ['service', 'dependency', 'outcome'],
      registers: [this.registry],
    });
    this.dependencyDuration = new Histogram({
      name: 'routefast_dependency_call_duration_seconds',
      help: 'Outbound dependency call latency',
      labelNames: ['service', 'dependency'],
      buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 1.5, 3],
      registers: [this.registry],
    });
    this.circuitState = new Gauge({
      name: 'routefast_circuit_breaker_state',
      help: 'Circuit-breaker state: CLOSED=0, HALF_OPEN=1, OPEN=2',
      labelNames: ['service', 'dependency'],
      registers: [this.registry],
    });
    this.circuitTransitions = new Counter({
      name: 'routefast_circuit_breaker_transitions_total',
      help: 'Circuit-breaker state transitions',
      labelNames: ['service', 'dependency', 'from', 'to'],
      registers: [this.registry],
    });
    this.routeOptimizationDuration = new Histogram({
      name: 'routefast_route_optimization_duration_seconds',
      help: 'Duration of the paired-insertion route heuristic',
      labelNames: ['service'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
      registers: [this.registry],
    });
    this.routeOptimizationOrders = new Histogram({
      name: 'routefast_route_optimization_orders',
      help: 'Number of orders supplied to each route-optimization request',
      labelNames: ['service'],
      buckets: [1, 2, 5, 10, 15, 20, 25],
      registers: [this.registry],
    });
    this.buildInfo.set({ service: this.serviceName(), phase: '6' }, 1);
  }

  observeHttp(service: string, method: string, route: string, status: string, durationSeconds: number): void {
    const labels = { service, method, route, status };
    this.requests.inc(labels);
    this.duration.observe(labels, durationSeconds);
  }

  observeDependency(dependency: string, outcome: CircuitCallOutcome, durationMs: number): void {
    const labels = { service: this.serviceName(), dependency };
    this.dependencyCalls.inc({ ...labels, outcome });
    if (outcome !== 'short_circuited') this.dependencyDuration.observe(labels, durationMs / 1000);
  }

  setCircuitState(dependency: string, state: CircuitBreakerState): void {
    const numericState = state === 'CLOSED' ? 0 : state === 'HALF_OPEN' ? 1 : 2;
    this.circuitState.set({ service: this.serviceName(), dependency }, numericState);
  }

  observeCircuitTransition(dependency: string, from: CircuitBreakerState, to: CircuitBreakerState): void {
    this.circuitTransitions.inc({ service: this.serviceName(), dependency, from, to });
    this.setCircuitState(dependency, to);
  }

  observeRouteOptimization(orderCount: number, durationMs: number): void {
    const labels = { service: this.serviceName() };
    this.routeOptimizationOrders.observe(labels, orderCount);
    this.routeOptimizationDuration.observe(labels, durationMs / 1000);
  }

  contentType(): string { return this.registry.contentType; }
  render(): Promise<string> { return this.registry.metrics(); }
  private serviceName(): string { return process.env.OTEL_SERVICE_NAME ?? 'dispatch-service'; }
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
      const service = process.env.OTEL_SERVICE_NAME ?? 'dispatch-service';
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
