import { IsIn } from 'class-validator';
import { DriverStatus } from '../../../domain/entities/driver-status.enum';

export class SetDriverAvailabilityDto {
  @IsIn([DriverStatus.AVAILABLE, DriverStatus.OFFLINE])
  status!: DriverStatus.AVAILABLE | DriverStatus.OFFLINE;
}
