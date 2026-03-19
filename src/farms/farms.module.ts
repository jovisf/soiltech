import { Module } from '@nestjs/common';
import { FarmsService } from './farms.service';
import { FarmsController } from './farms.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { WeatherModule } from '@/weather/weather.module';

@Module({
  imports: [PrismaModule, WeatherModule],
  controllers: [FarmsController],
  providers: [FarmsService],
  exports: [FarmsService],
})
export class FarmsModule {}
