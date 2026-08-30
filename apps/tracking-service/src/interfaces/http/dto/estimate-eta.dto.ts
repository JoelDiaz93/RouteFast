import { IsNumber, IsString, Max, Min, MinLength } from 'class-validator';

export class EstimateEtaDto {
  @IsString() @MinLength(1) driverId!: string;
  @IsNumber() @Min(-90) @Max(90) latitude!: number;
  @IsNumber() @Min(-180) @Max(180) longitude!: number;
}
