import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';
export class CreateDriverDto {
  @IsString() @MinLength(2) displayName!: string;
  @IsInt() @Min(1) @Max(20) capacity!: number;
}
