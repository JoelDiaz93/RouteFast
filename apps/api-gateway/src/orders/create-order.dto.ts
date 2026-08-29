import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  Max,
  Min,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { OrderPriority } from './order-priority';

export class LocationDto {
  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @IsEnum(OrderPriority)
  priority!: OrderPriority;

  @ValidateNested()
  @Type(() => LocationDto)
  pickup!: LocationDto;

  @ValidateNested()
  @Type(() => LocationDto)
  dropoff!: LocationDto;
}
