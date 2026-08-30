import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsNumber, IsString, Max, Min, ValidateNested } from 'class-validator';

export class RoutePointDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;
}

export class RoutePlanOrderDto {
  @IsString()
  orderId!: string;

  @IsInt()
  @Min(1)
  @Max(100)
  demand!: number;

  @ValidateNested()
  @Type(() => RoutePointDto)
  pickup!: RoutePointDto;

  @ValidateNested()
  @Type(() => RoutePointDto)
  dropoff!: RoutePointDto;
}

export class RoutePlanDto {
  @ValidateNested()
  @Type(() => RoutePointDto)
  origin!: RoutePointDto;

  @IsInt()
  @Min(1)
  @Max(100)
  vehicleCapacity!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(25)
  @ValidateNested({ each: true })
  @Type(() => RoutePlanOrderDto)
  orders!: RoutePlanOrderDto[];
}
