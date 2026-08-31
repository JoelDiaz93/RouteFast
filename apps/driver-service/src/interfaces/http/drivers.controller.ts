import { Body, ConflictException, Controller, Get, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateDriverUseCase } from '../../application/use-cases/create-driver.use-case';
import { DriverView } from '../../application/use-cases/driver.view';
import { ListDriverCandidatesUseCase } from '../../application/use-cases/list-driver-candidates.use-case';
import { ListDriversUseCase } from '../../application/use-cases/list-drivers.use-case';
import { SetDriverAvailabilityUseCase } from '../../application/use-cases/set-driver-availability.use-case';
import { CreateDriverDto } from './dto/create-driver.dto';
import { DriverUnavailableError } from '../../domain/errors/driver-unavailable.error';
import { SetDriverAvailabilityDto } from './dto/set-driver-availability.dto';

@Controller('drivers')
export class DriversController {
  constructor(
    private readonly createDriver: CreateDriverUseCase,
    private readonly listDrivers: ListDriversUseCase,
    private readonly listCandidates: ListDriverCandidatesUseCase,
    private readonly setAvailability: SetDriverAvailabilityUseCase,
  ) {}

  @Post() create(@Body() body: CreateDriverDto): Promise<DriverView> { return this.createDriver.execute(body); }
  @Get() list(@Query('limit') rawLimit?: string): Promise<DriverView[]> {
    const parsed = Number(rawLimit ?? 100);
    const limit = Number.isInteger(parsed) ? Math.min(Math.max(parsed, 1), 500) : 100;
    return this.listDrivers.execute(limit);
  }
  @Get('candidates')
  candidates(@Query('limit') rawLimit?: string) {
    const parsed = Number(rawLimit ?? 20);
    return this.listCandidates.execute(Number.isInteger(parsed) ? parsed : 20);
  }
  @Patch(':driverId/availability')
  async availability(@Param('driverId') driverId: string, @Body() body: SetDriverAvailabilityDto): Promise<DriverView> {
    try {
      return await this.setAvailability.execute(driverId, body.status);
    } catch (error) {
      if (error instanceof DriverUnavailableError) {
        throw new ConflictException({
          code: 'DRIVER_AVAILABILITY_CONFLICT',
          message: error.message,
        });
      }
      if (error instanceof Error && error.message === `Driver ${driverId} not found`) {
        throw new NotFoundException({ code: 'DRIVER_NOT_FOUND', message: error.message });
      }
      throw error;
    }
  }
}
