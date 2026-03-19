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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PivotsService } from './pivots.service';
import { CreatePivotDto } from './dto/create-pivot.dto';
import { UpdatePivotDto } from './dto/update-pivot.dto';
import { PivotCommandDto } from './dto/pivot-command.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { WeatherService } from '@/weather/weather.service';
import { WeatherResponseDto } from '@/weather/dto/weather-response.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PivotsController {
  constructor(
    private readonly pivotsService: PivotsService,
    private readonly weatherService: WeatherService,
  ) {}

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

  @Get('pivots/:id/weather')
  async getWeather(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WeatherResponseDto> {
    const pivot = await this.pivotsService.findOne(id);
    return this.weatherService.getWeatherByCoordinates(
      pivot.latitude,
      pivot.longitude,
    );
  }

  @Patch('pivots/:id')
  @Roles(Role.ADMIN, Role.OPERATOR)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePivotDto: UpdatePivotDto,
  ) {
    return this.pivotsService.update(id, updatePivotDto);
  }

  @Post('pivots/:id/command')
  @Roles(Role.ADMIN, Role.OPERATOR)
  @HttpCode(HttpStatus.ACCEPTED)
  async sendCommand(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() pivotCommandDto: PivotCommandDto,
  ) {
    await this.pivotsService.sendCommand(id, pivotCommandDto);
  }

  @Delete('pivots/:id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.pivotsService.remove(id);
  }
}
