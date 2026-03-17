import { ConfigService as NestConfigService } from '@nestjs/config';
export declare class ConfigService {
    private nestConfigService;
    constructor(nestConfigService: NestConfigService);
    getAppPort(): number;
    getDatabaseUrl(): string;
    getJwtSecret(): string;
    getJwtExpiration(): string;
    getRedisHost(): string;
    getRedisPort(): number;
    getAwsIotEndpoint(): string;
    getAwsIotClientId(): string;
    getAwsIotCertPath(): string;
    getAwsIotKeyPath(): string;
    getAwsIotCaPath(): string;
    getMqttTopicPrefix(): string;
    getWeatherApiBaseUrl(): string;
    getWeatherCacheTtl(): number;
}
