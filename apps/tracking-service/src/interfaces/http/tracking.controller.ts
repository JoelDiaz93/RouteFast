import { Body, Controller, Get, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { EstimateEtaUseCase } from '../../application/use-cases/estimate-eta.use-case';
import { FindNearbyDriversUseCase } from '../../application/use-cases/find-nearby-drivers.use-case';
import { GetLatestLocationUseCase } from '../../application/use-cases/get-latest-location.use-case';
import { GetLocationHistoryUseCase } from '../../application/use-cases/get-location-history.use-case';
import { UpdateDriverLocationUseCase } from '../../application/use-cases/update-driver-location.use-case';
import { EstimateEtaDto } from './dto/estimate-eta.dto';
import { NearbyDriversDto } from './dto/nearby-drivers.dto';
import { UpdateDriverLocationDto } from './dto/update-driver-location.dto';
import { MetricsService } from '../../observability/metrics.module';

@Controller('tracking')
export class TrackingController {
  constructor(
    private readonly updateLocation: UpdateDriverLocationUseCase,
    private readonly getLatest: GetLatestLocationUseCase,
    private readonly getHistory: GetLocationHistoryUseCase,
    private readonly findNearby: FindNearbyDriversUseCase,
    private readonly estimateEta: EstimateEtaUseCase,
    private readonly metrics: MetricsService,
  ) {}

  @Post('locations')
  async update(@Body() body: UpdateDriverLocationDto) {
    const result = await this.updateLocation.execute(body);
    this.metrics.observeLocationUpdate('http', result.acceptedAsCurrent);
    return result;
  }

  @Get('drivers/:driverId/latest')
  async latest(@Param('driverId') driverId: string) {
    const location = await this.getLatest.execute(driverId);
    if (!location) throw new NotFoundException(`No location for driver ${driverId}`);
    return location;
  }

  @Get('drivers/:driverId/history')
  history(@Param('driverId') driverId: string, @Query('limit') rawLimit?: string) {
    const parsed = Number(rawLimit ?? 50);
    const limit = Number.isInteger(parsed) ? Math.min(Math.max(parsed, 1), 100) : 50;
    return this.getHistory.execute(driverId, limit);
  }

  @Post('nearby')
  nearby(@Body() body: NearbyDriversDto) { return this.findNearby.execute(body); }

  @Post('eta')
  async eta(@Body() body: EstimateEtaDto) {
    const eta = await this.estimateEta.execute(body);
    if (!eta) throw new NotFoundException(`No live location for driver ${body.driverId}`);
    return eta;
  }
}
