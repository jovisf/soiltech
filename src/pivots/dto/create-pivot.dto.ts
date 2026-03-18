import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsPositive,
  Min,
  Max,
} from 'class-validator';

export class CreatePivotDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsNumber()
  @IsPositive()
  bladeAt100!: number;
}
