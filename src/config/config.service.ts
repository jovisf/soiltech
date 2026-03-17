import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private nestConfigService: NestConfigService) {}

  getAppPort(): number {
    return this.nestConfigService.get<number>('PORT')!;
  }

  getDatabaseUrl(): string {
    return this.nestConfigService.get<string>('DATABASE_URL')!;
  }

  getJwtSecret(): string {
    return this.nestConfigService.get<string>('JWT_SECRET')!;
  }

  getJwtExpiration(): string {
    return this.nestConfigService.get<string>('JWT_EXPIRATION')!;
  }

  getRedisHost(): string {
    return this.nestConfigService.get<string>('REDIS_HOST')!;
  }

  getRedisPort(): number {
    return this.nestConfigService.get<number>('REDIS_PORT')!;
  }

  getAwsIotEndpoint(): string {
    return this.nestConfigService.get<string>('AWS_IOT_ENDPOINT')!;
  }

  getAwsIotClientId(): string {
    return this.nestConfigService.get<string>('AWS_IOT_CLIENT_ID')!;
  }

  getAwsIotCertPath(): string {
    return this.nestConfigService.get<string>('AWS_IOT_CERT_PATH')!;
  }

  getAwsIotKeyPath(): string {
    return this.nestConfigService.get<string>('AWS_IOT_KEY_PATH')!;
  }

  getAwsIotCaPath(): string {
    return this.nestConfigService.get<string>('AWS_IOT_CA_PATH')!;
  }

  getMqttTopicPrefix(): string {
    return this.nestConfigService.get<string>('MQTT_TOPIC_PREFIX')!;
  }

  getWeatherApiBaseUrl(): string {
    return this.nestConfigService.get<string>('WEATHER_API_BASE_URL')!;
  }

  getWeatherCacheTtl(): number {
    return this.nestConfigService.get<number>('WEATHER_CACHE_TTL')!;
  }
}
