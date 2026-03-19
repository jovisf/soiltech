import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { WeatherService } from './weather.service';
import { ConfigModule } from '@/config/config.module';
import { ConfigService } from '@/config/config.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: configService.getRedisHost(),
            port: configService.getRedisPort(),
          },
          ttl: configService.getWeatherCacheTtl() * 1000,
        }),
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
  ],
  providers: [WeatherService],
  exports: [WeatherService],
})
export class WeatherModule {}
