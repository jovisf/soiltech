import { Test, TestingModule } from '@nestjs/testing';
import { WeatherService } from './weather.service';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@/config/config.service';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import { ServiceUnavailableException } from '@nestjs/common';

describe('WeatherService', () => {
  let service: WeatherService;
  let httpService: jest.Mocked<HttpService>;
  let cacheManager: {
    get: jest.Mock;
    set: jest.Mock;
  };
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    httpService = {
      get: jest.fn(),
    } as any;

    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    configService = {
      getWeatherApiBaseUrl: jest.fn().mockReturnValue('https://api.weather.com'),
      getWeatherCacheTtl: jest.fn().mockReturnValue(1800),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeatherService,
        { provide: HttpService, useValue: httpService },
        { provide: CACHE_MANAGER, useValue: cacheManager },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<WeatherService>(WeatherService);
  });

  describe('getWeatherByCoordinates', () => {
    const lat = -23.5505;
    const lng = -46.6333;
    const cacheKey = `weather:${lat}:${lng}`;

    it('should return cached weather if available', async () => {
      const cachedWeather = {
        temperature: 20,
        humidity: 60,
        windSpeed: 10,
        conditions: 'Clear sky',
      };
      cacheManager.get.mockResolvedValue(cachedWeather);

      const result = await service.getWeatherByCoordinates(lat, lng);

      expect(result).toEqual(cachedWeather);
      expect(cacheManager.get).toHaveBeenCalledWith(cacheKey);
      expect(httpService.get).not.toHaveBeenCalled();
    });

    it('should fetch weather from API and cache it if not in cache', async () => {
      cacheManager.get.mockResolvedValue(null);
      const apiResponse: AxiosResponse = {
        data: {
          current: {
            temperature_2m: 25,
            relative_humidity_2m: 50,
            wind_speed_10m: 15,
            weather_code: 0,
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      httpService.get.mockReturnValue(of(apiResponse));

      const result = await service.getWeatherByCoordinates(lat, lng);

      expect(result).toEqual({
        temperature: 25,
        humidity: 50,
        windSpeed: 15,
        conditions: 'Clear sky',
      });
      expect(cacheManager.get).toHaveBeenCalledWith(cacheKey);
      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.weather.com/forecast',
        expect.objectContaining({
          params: expect.objectContaining({
            latitude: lat,
            longitude: lng,
          }),
        }),
      );
      expect(cacheManager.set).toHaveBeenCalledWith(
        cacheKey,
        result,
        1800 * 1000,
      );
    });

    it('should throw ServiceUnavailableException when API call fails with AxiosError', async () => {
      cacheManager.get.mockResolvedValue(null);
      const axiosError = new AxiosError('API Error');
      httpService.get.mockReturnValue(throwError(() => axiosError));

      await expect(service.getWeatherByCoordinates(lat, lng)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should throw original error when non-Axios error occurs', async () => {
      cacheManager.get.mockResolvedValue(null);
      const error = new Error('Unexpected Error');
      httpService.get.mockReturnValue(throwError(() => error));

      await expect(service.getWeatherByCoordinates(lat, lng)).rejects.toThrow(
        'Unexpected Error',
      );
    });

    it('should handle various weather codes correctly', async () => {
      cacheManager.get.mockResolvedValue(null);
      const codes = [3, 45, 95];
      const conditions = ['Overcast', 'Fog', 'Thunderstorm: Slight or moderate'];

      for (let i = 0; i < codes.length; i++) {
        const apiResponse: AxiosResponse = {
          data: {
            current: {
              temperature_2m: 20,
              relative_humidity_2m: 60,
              wind_speed_10m: 10,
              weather_code: codes[i],
            },
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: { headers: new AxiosHeaders() },
        };
        httpService.get.mockReturnValue(of(apiResponse));

        const result = await service.getWeatherByCoordinates(lat, lng);
        expect(result.conditions).toBe(conditions[i]);
      }
    });

    it('should return "Unknown" for unmapped weather codes', async () => {
      cacheManager.get.mockResolvedValue(null);
      const apiResponse: AxiosResponse = {
        data: {
          current: {
            temperature_2m: 20,
            relative_humidity_2m: 60,
            wind_speed_10m: 10,
            weather_code: 999,
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      httpService.get.mockReturnValue(of(apiResponse));

      const result = await service.getWeatherByCoordinates(lat, lng);
      expect(result.conditions).toBe('Unknown');
    });
  });
});
