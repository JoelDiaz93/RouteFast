import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateDriverUseCase } from '../../application/use-cases/create-driver.use-case';
import { DriverView } from '../../application/use-cases/driver.view';
import { ListDriverCandidatesUseCase } from '../../application/use-cases/list-driver-candidates.use-case';
import { ListDriversUseCase } from '../../application/use-cases/list-drivers.use-case';
import { SetDriverAvailabilityUseCase } from '../../application/use-cases/set-driver-availability.use-case';
import { CreateDriverDto } from './dto/create-driver.dto';
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
  @Get() list(): Promise<DriverView[]> { return this.listDrivers.execute(); }
  @Get('candidates')
  candidates(@Query('limit') rawLimit?: string) {
    const parsed = Number(rawLimit ?? 20);
    return this.listCandidates.execute(Number.isInteger(parsed) ? parsed : 20);
  }
  @Patch(':driverId/availability')
  availability(@Param('driverId') driverId: string, @Body() body: SetDriverAvailabilityDto): Promise<DriverView> {
    return this.setAvailability.execute(driverId, body.status);
  }
}
