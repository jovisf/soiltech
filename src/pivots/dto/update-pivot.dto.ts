import { PartialType } from '@nestjs/mapped-types';
import { CreatePivotDto } from './create-pivot.dto';

export class UpdatePivotDto extends PartialType(CreatePivotDto) {}
