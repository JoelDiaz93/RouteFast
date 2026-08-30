import { Body, Controller, Post } from '@nestjs/common';
import { RoutePlannerService } from '../../application/optimization/route-planner.service';
import { MetricsService } from '../../observability/metrics.module';
import { RoutePlanDto } from './dto/route-plan.dto';

@Controller('optimization')
export class OptimizationController {
  constructor(
    private readonly planner: RoutePlannerService,
    private readonly metrics: MetricsService,
  ) {}

  @Post('route-plan')
  plan(@Body() input: RoutePlanDto) {
    const started = performance.now();
    try {
      const result = this.planner.plan(input);
      this.metrics.observeRouteOptimization(input.orders.length, performance.now() - started);
      return result;
    } catch (error) {
      this.metrics.observeRouteOptimization(input.orders.length, performance.now() - started);
      throw error;
    }
  }
}
