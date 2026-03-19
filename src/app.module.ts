import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@/config/config.module';
import { ConfigService } from '@/config/config.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/auth/auth.module';
import { UsersModule } from '@/users/users.module';
import { FarmsModule } from '@/farms/farms.module';
import { PivotsModule } from '@/pivots/pivots.module';
import { BullModule } from '@nestjs/bullmq';
import { MqttModule } from '@/mqtt/mqtt.module';
import { WebsocketModule } from '@/websocket/websocket.module';

import { StatesModule } from '@/states/states.module';
import { CyclesModule } from '@/cycles/cycles.module';
import { WeatherModule } from '@/weather/weather.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    FarmsModule,
    PivotsModule,
    StatesModule,
    CyclesModule,
    MqttModule,
    WebsocketModule,
    WeatherModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.getRedisHost(),
          port: config.getRedisPort(),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
