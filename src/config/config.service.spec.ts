import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from './config.service';
import { ConfigService as NestConfigService } from '@nestjs/config';

describe('ConfigService', () => {
  let service: ConfigService;
  let nestConfigService: NestConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        {
          provide: NestConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'NODE_ENV':
                  return 'test';
                case 'PORT':
                  return 3000;
                case 'DATABASE_URL':
                  return 'postgresql://user:password@host:port/database';
                case 'JWT_SECRET':
                  return 'supersecretjwtkey';
                case 'JWT_EXPIRATION':
                  return '1h';
                case 'REDIS_HOST':
                  return 'localhost';
                case 'REDIS_PORT':
                  return 6379;
                case 'AWS_IOT_ENDPOINT':
                  return 'test.iot.us-east-1.amazonaws.com';
                case 'AWS_IOT_CLIENT_ID':
                  return 'test-client';
                case 'AWS_IOT_CERT_PATH':
                  return './certs/test-cert.pem';
                case 'AWS_IOT_KEY_PATH':
                  return './certs/test-key.pem';
                case 'AWS_IOT_CA_PATH':
                  return './certs/test-ca.pem';
                case 'MQTT_TOPIC_PREFIX':
                  return 'test/topic';
                case 'WEATHER_API_BASE_URL':
                  return 'https://api.test-weather.com';
                case 'WEATHER_CACHE_TTL':
                  return 3600;
                default:
                  return undefined;
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ConfigService>(ConfigService);
    nestConfigService = module.get<NestConfigService>(NestConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAppPort', () => {
    it('should return the application port', () => {
      expect(service.getAppPort()).toBe(3000);
      expect(nestConfigService.get).toHaveBeenCalledWith('PORT');
    });
  });

  describe('getDatabaseUrl', () => {
    it('should return the database URL', () => {
      expect(service.getDatabaseUrl()).toBe('postgresql://user:password@host:port/database');
      expect(nestConfigService.get).toHaveBeenCalledWith('DATABASE_URL');
    });
  });

  describe('getJwtSecret', () => {
    it('should return the JWT secret', () => {
      expect(service.getJwtSecret()).toBe('supersecretjwtkey');
      expect(nestConfigService.get).toHaveBeenCalledWith('JWT_SECRET');
    });
  });

  describe('getJwtExpiration', () => {
    it('should return the JWT expiration', () => {
      expect(service.getJwtExpiration()).toBe('1h');
      expect(nestConfigService.get).toHaveBeenCalledWith('JWT_EXPIRATION');
    });
  });

  describe('getRedisHost', () => {
    it('should return the Redis host', () => {
      expect(service.getRedisHost()).toBe('localhost');
      expect(nestConfigService.get).toHaveBeenCalledWith('REDIS_HOST');
    });
  });

  describe('getRedisPort', () => {
    it('should return the Redis port', () => {
      expect(service.getRedisPort()).toBe(6379);
      expect(nestConfigService.get).toHaveBeenCalledWith('REDIS_PORT');
    });
  });

  describe('getAwsIotEndpoint', () => {
    it('should return the AWS IoT endpoint', () => {
      expect(service.getAwsIotEndpoint()).toBe('test.iot.us-east-1.amazonaws.com');
      expect(nestConfigService.get).toHaveBeenCalledWith('AWS_IOT_ENDPOINT');
    });
  });

  describe('getAwsIotClientId', () => {
    it('should return the AWS IoT client ID', () => {
      expect(service.getAwsIotClientId()).toBe('test-client');
      expect(nestConfigService.get).toHaveBeenCalledWith('AWS_IOT_CLIENT_ID');
    });
  });

  describe('getAwsIotCertPath', () => {
    it('should return the AWS IoT certificate path', () => {
      expect(service.getAwsIotCertPath()).toBe('./certs/test-cert.pem');
      expect(nestConfigService.get).toHaveBeenCalledWith('AWS_IOT_CERT_PATH');
    });
  });

  describe('getAwsIotKeyPath', () => {
    it('should return the AWS IoT key path', () => {
      expect(service.getAwsIotKeyPath()).toBe('./certs/test-key.pem');
      expect(nestConfigService.get).toHaveBeenCalledWith('AWS_IOT_KEY_PATH');
    });
  });

  describe('getAwsIotCaPath', () => {
    it('should return the AWS IoT CA path', () => {
      expect(service.getAwsIotCaPath()).toBe('./certs/test-ca.pem');
      expect(nestConfigService.get).toHaveBeenCalledWith('AWS_IOT_CA_PATH');
    });
  });

  describe('getMqttTopicPrefix', () => {
    it('should return the MQTT topic prefix', () => {
      expect(service.getMqttTopicPrefix()).toBe('test/topic');
      expect(nestConfigService.get).toHaveBeenCalledWith('MQTT_TOPIC_PREFIX');
    });
  });

  describe('getWeatherApiBaseUrl', () => {
    it('should return the weather API base URL', () => {
      expect(service.getWeatherApiBaseUrl()).toBe('https://api.test-weather.com');
      expect(nestConfigService.get).toHaveBeenCalledWith('WEATHER_API_BASE_URL');
    });
  });

  describe('getWeatherCacheTtl', () => {
    it('should return the weather cache TTL', () => {
      expect(service.getWeatherCacheTtl()).toBe(3600);
      expect(nestConfigService.get).toHaveBeenCalledWith('WEATHER_CACHE_TTL');
    });
  });

  // Error path and edge cases for missing environment variables are generally handled
  // by the Joi validation in ConfigModule. For unit tests, we assume that if the
  // `nestConfigService.get` returns `undefined`, the application would have
  // already failed at startup due to Joi validation. Hence, direct testing for
  // `undefined` returns is less critical here, as the `ConfigService` methods
  // use non-null assertions.
});
