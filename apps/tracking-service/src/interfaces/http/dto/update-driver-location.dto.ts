import { IsISO8601, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class UpdateDriverLocationDto {
  @IsString() @MinLength(1) driverId!: string;
  @IsNumber() @Min(-90) @Max(90) latitude!: number;
  @IsNumber() @Min(-180) @Max(180) longitude!: number;
  @IsOptional() @IsNumber() @Min(0) @Max(250) speedKph?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(359.999) headingDegrees?: number;
  @IsOptional() @IsISO8601() recordedAt?: string;
}
