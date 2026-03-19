import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Patch,
  Delete,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FarmsService } from './farms.service';
import { CreateFarmDto } from './dto/create-farm.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { WeatherService } from '@/weather/weather.service';
import { WeatherResponseDto } from '@/weather/dto/weather-response.dto';

@Controller('farms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FarmsController {
  constructor(
    private readonly farmsService: FarmsService,
    private readonly weatherService: WeatherService,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.OPERATOR)
  create(@Body() createFarmDto: CreateFarmDto) {
    return this.farmsService.create(createFarmDto);
  }

  @Get()
  findAll() {
    return this.farmsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.farmsService.findOne(id);
  }

  @Get(':id/weather')
  async getWeather(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WeatherResponseDto> {
    const farm = await this.farmsService.findOne(id);
    return this.weatherService.getWeatherByCoordinates(
      farm.latitude,
      farm.longitude,
    );
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.OPERATOR)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateFarmDto: UpdateFarmDto,
  ) {
    return this.farmsService.update(id, updateFarmDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.farmsService.remove(id);
  }
}
