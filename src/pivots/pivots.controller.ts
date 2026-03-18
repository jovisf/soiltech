import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { PivotsService } from './pivots.service';
import { CreatePivotDto } from './dto/create-pivot.dto';
import { UpdatePivotDto } from './dto/update-pivot.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PivotsController {
  constructor(private readonly pivotsService: PivotsService) {}

  @Post('farms/:farmId/pivots')
  @Roles(Role.ADMIN, Role.OPERATOR)
  create(
    @Param('farmId', ParseUUIDPipe) farmId: string,
    @Body() createPivotDto: CreatePivotDto,
  ) {
    return this.pivotsService.create(farmId, createPivotDto);
  }

  @Get('farms/:farmId/pivots')
  findAllByFarm(@Param('farmId', ParseUUIDPipe) farmId: string) {
    return this.pivotsService.findAllByFarm(farmId);
  }

  @Get('pivots/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.pivotsService.findOne(id);
  }

  @Patch('pivots/:id')
  @Roles(Role.ADMIN, Role.OPERATOR)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePivotDto: UpdatePivotDto,
  ) {
    return this.pivotsService.update(id, updatePivotDto);
  }

  @Delete('pivots/:id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.pivotsService.remove(id);
  }
}
