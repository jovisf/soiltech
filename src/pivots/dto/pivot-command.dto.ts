import {
  IsEnum,
  IsBoolean,
  IsOptional,
  IsInt,
  Min,
  Max,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';

export enum PivotAction {
  TURN_ON = 'turn_on',
  TURN_OFF = 'turn_off',
}

export enum PivotDirection {
  CLOCKWISE = 'clockwise',
  COUNTER_CLOCKWISE = 'counter-clockwise',
}

export class PivotCommandDto {
  @IsNotEmpty()
  @IsEnum(PivotAction)
  action!: PivotAction;

  @IsOptional()
  @IsEnum(PivotDirection)
  direction?: PivotDirection;

  @IsOptional()
  @IsBoolean()
  withWater?: boolean;

  @ValidateIf((o) => o.withWater === true)
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  @Max(100)
  percentimeter?: number;
}
