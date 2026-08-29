import { IsIn } from 'class-validator';
export class SetDriverAvailabilityDto {
  @IsIn(['AVAILABLE', 'OFFLINE']) status!: 'AVAILABLE' | 'OFFLINE';
}
