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
import { CyclesService } from './cycles.service';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

@Controller('pivots')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CyclesController {
  constructor(private readonly cyclesService: CyclesService) {}

  @Get(':id/states/:stateId/cycles')
  async findAllByState(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stateId', ParseUUIDPipe) stateId: string,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    return this.cyclesService.findAllByState(id, stateId, paginationQuery);
  }
}
