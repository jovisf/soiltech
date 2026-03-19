import { Module } from '@nestjs/common';
import { PivotsService } from './pivots.service';
import { PivotsController } from './pivots.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { WeatherModule } from '@/weather/weather.module';
import { MqttModule } from '@/mqtt/mqtt.module';
import { ConfigModule } from '@/config/config.module';

@Module({
  imports: [PrismaModule, WeatherModule, MqttModule, ConfigModule],
  controllers: [PivotsController],
  providers: [PivotsService],
  exports: [PivotsService],
})
export class PivotsModule {}
