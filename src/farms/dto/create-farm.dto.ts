import { IsNotEmpty, IsString, IsNumber, Min, Max } from 'class-validator';

export class CreateFarmDto {
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
}
