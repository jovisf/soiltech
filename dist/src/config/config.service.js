"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let ConfigService = class ConfigService {
    nestConfigService;
    constructor(nestConfigService) {
        this.nestConfigService = nestConfigService;
    }
    getAppPort() {
        return this.nestConfigService.get('PORT');
    }
    getDatabaseUrl() {
        return this.nestConfigService.get('DATABASE_URL');
    }
    getJwtSecret() {
        return this.nestConfigService.get('JWT_SECRET');
    }
    getJwtExpiration() {
        return this.nestConfigService.get('JWT_EXPIRATION');
    }
    getRedisHost() {
        return this.nestConfigService.get('REDIS_HOST');
    }
    getRedisPort() {
        return this.nestConfigService.get('REDIS_PORT');
    }
    getAwsIotEndpoint() {
        return this.nestConfigService.get('AWS_IOT_ENDPOINT');
    }
    getAwsIotClientId() {
        return this.nestConfigService.get('AWS_IOT_CLIENT_ID');
    }
    getAwsIotCertPath() {
        return this.nestConfigService.get('AWS_IOT_CERT_PATH');
    }
    getAwsIotKeyPath() {
        return this.nestConfigService.get('AWS_IOT_KEY_PATH');
    }
    getAwsIotCaPath() {
        return this.nestConfigService.get('AWS_IOT_CA_PATH');
    }
    getMqttTopicPrefix() {
        return this.nestConfigService.get('MQTT_TOPIC_PREFIX');
    }
    getWeatherApiBaseUrl() {
        return this.nestConfigService.get('WEATHER_API_BASE_URL');
    }
    getWeatherCacheTtl() {
        return this.nestConfigService.get('WEATHER_CACHE_TTL');
    }
};
exports.ConfigService = ConfigService;
exports.ConfigService = ConfigService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ConfigService);
//# sourceMappingURL=config.service.js.map