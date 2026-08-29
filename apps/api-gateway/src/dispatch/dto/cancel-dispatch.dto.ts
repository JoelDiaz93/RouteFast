import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelDispatchDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reason?: string;
}
