import { Injectable, Inject, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ConfigService } from '@/config/config.service';
import { WeatherResponseDto } from './dto/weather-response.dto';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class WeatherService {
  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {}

  async getWeatherByCoordinates(lat: number, lng: number): Promise<WeatherResponseDto> {
    const cacheKey = `weather:${lat}:${lng}`;
    const cachedWeather = await this.cacheManager.get<WeatherResponseDto>(cacheKey);

    if (cachedWeather) {
      return cachedWeather;
    }

    const baseUrl = this.configService.getWeatherApiBaseUrl();
    const url = `${baseUrl}/forecast`;
    const params = {
      latitude: lat,
      longitude: lng,
      current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
    };

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(url, { params }),
      );

      const weather: WeatherResponseDto = {
        temperature: data.current.temperature_2m,
        humidity: data.current.relative_humidity_2m,
        windSpeed: data.current.wind_speed_10m,
        conditions: this.mapWeatherCodeToCondition(data.current.weather_code),
      };

      const ttl = this.configService.getWeatherCacheTtl();
      await this.cacheManager.set(cacheKey, weather, ttl * 1000); // cache-manager ttl is in milliseconds for some stores, but in v5 it is mostly seconds. Redis-yet v5 expects milliseconds.

      return weather;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new ServiceUnavailableException('Weather API is currently unavailable');
      }
      throw error;
    }
  }

  private mapWeatherCodeToCondition(code: number): string {
    const mapping: { [key: number]: string } = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Fog',
      48: 'Depositing rime fog',
      51: 'Drizzle: Light',
      53: 'Drizzle: Moderate',
      55: 'Drizzle: Dense intensity',
      56: 'Freezing Drizzle: Light',
      57: 'Freezing Drizzle: Dense intensity',
      61: 'Rain: Slight',
      63: 'Rain: Moderate',
      65: 'Rain: Heavy intensity',
      66: 'Freezing Rain: Light',
      67: 'Freezing Rain: Heavy intensity',
      71: 'Snow fall: Slight',
      73: 'Snow fall: Moderate',
      75: 'Snow fall: Heavy intensity',
      77: 'Snow grains',
      80: 'Rain showers: Slight',
      81: 'Rain showers: Moderate',
      82: 'Rain showers: Violent',
      85: 'Snow showers slight',
      86: 'Snow showers heavy',
      95: 'Thunderstorm: Slight or moderate',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail',
    };

    return mapping[code] || 'Unknown';
  }
}
