import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { StatesService } from './states.service';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

@Controller('pivots')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatesController {
  constructor(private readonly statesService: StatesService) {}

  @Get(':id/states')
  async findAllByPivot(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    return this.statesService.findAllByPivot(id, paginationQuery);
  }
}
