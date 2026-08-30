import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class NearbyDriversDto {
  @IsNumber() @Min(-90) @Max(90) latitude!: number;
  @IsNumber() @Min(-180) @Max(180) longitude!: number;
  @IsNumber() @Min(0.1) @Max(100) radiusKm!: number;
  @IsInt() @Min(1) @Max(100) limit!: number;
  @IsOptional() @IsArray() @IsString({ each: true }) candidateDriverIds?: string[];
  @IsOptional() @IsInt() @Min(1) @Max(3600) maxAgeSeconds?: number;
}
