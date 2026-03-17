import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { ConfigService } from './config.service';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test', 'provision')
          .default('development'),
        PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRATION: Joi.string().required(),
        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.number().required(),
        AWS_IOT_ENDPOINT: Joi.string().required(),
        AWS_IOT_CLIENT_ID: Joi.string().required(),
        AWS_IOT_CERT_PATH: Joi.string().required(),
        AWS_IOT_KEY_PATH: Joi.string().required(),
        AWS_IOT_CA_PATH: Joi.string().required(),
        MQTT_TOPIC_PREFIX: Joi.string().required(),
        WEATHER_API_BASE_URL: Joi.string().required(),
        WEATHER_CACHE_TTL: Joi.number().required(),
      }),
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
