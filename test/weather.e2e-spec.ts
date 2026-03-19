import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { Role } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosHeaders, AxiosResponse, AxiosError } from 'axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('Weather (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let httpService: HttpService;
  let cacheManager: any;

  let adminToken: string;
  let viewerToken: string;

  let farmId: string;
  let pivotId: string;

  const mockWeatherResponse: Partial<AxiosResponse> = {
    data: {
      current: {
        temperature_2m: 25.5,
        relative_humidity_2m: 60,
        wind_speed_10m: 12.3,
        weather_code: 0,
      },
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(HttpService)
      .useValue({
        get: jest.fn().mockReturnValue(of(mockWeatherResponse)),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);
    httpService = app.get<HttpService>(HttpService);
    cacheManager = app.get(CACHE_MANAGER);

    // Clean up database
    await prisma.pivot.deleteMany();
    await prisma.farm.deleteMany();
    await prisma.user.deleteMany();

    // Create test users and tokens
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@weather.com',
        name: 'Admin',
        password: 'password',
        role: Role.ADMIN,
      },
    });
    adminToken = jwtService.sign({
      sub: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    });

    const viewerUser = await prisma.user.create({
      data: {
        email: 'viewer@weather.com',
        name: 'Viewer',
        password: 'password',
        role: Role.VIEWER,
      },
    });
    viewerToken = jwtService.sign({
      sub: viewerUser.id,
      email: viewerUser.email,
      role: viewerUser.role,
    });

    // Create a farm and a pivot
    const farm = await prisma.farm.create({
      data: { name: 'Weather Farm', latitude: -23.55, longitude: -46.63 },
    });
    farmId = farm.id;

    const pivot = await prisma.pivot.create({
      data: {
        farmId: farm.id,
        name: 'Weather Pivot',
        latitude: -23.56,
        longitude: -46.64,
        bladeAt100: 20,
        status: {},
      },
    });
    pivotId = pivot.id;
  });

  afterAll(async () => {
    await prisma.pivot.deleteMany();
    await prisma.farm.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await cacheManager.clear();
  });

  describe('GET /farms/:id/weather', () => {
    it('should return weather for farm coordinates', async () => {
      const res = await request(app.getHttpServer())
        .get(`/farms/${farmId}/weather`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      expect(res.body).toEqual({
        temperature: 25.5,
        humidity: 60,
        windSpeed: 12.3,
        conditions: 'Clear sky',
      });
      expect(httpService.get).toHaveBeenCalledTimes(1);
    });

    it('should return cached weather on second call', async () => {
      // First call to populate cache
      await request(app.getHttpServer())
        .get(`/farms/${farmId}/weather`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      // Second call should hit cache
      const res = await request(app.getHttpServer())
        .get(`/farms/${farmId}/weather`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      expect(res.body).toEqual({
        temperature: 25.5,
        humidity: 60,
        windSpeed: 12.3,
        conditions: 'Clear sky',
      });
      expect(httpService.get).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get(`/farms/${farmId}/weather`)
        .expect(401);
    });

    it('should return 404 for nonexistent farm', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/farms/${nonExistentId}/weather`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      await request(app.getHttpServer())
        .get('/farms/invalid-uuid/weather')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(400);
    });

    it('should return 503 if external API fails', async () => {
      const axiosError = new AxiosError('API Error');
      jest.spyOn(httpService, 'get').mockReturnValueOnce(throwError(() => axiosError));

      await request(app.getHttpServer())
        .get(`/farms/${farmId}/weather`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(503);
    });
  });

  describe('GET /pivots/:id/weather', () => {
    it('should return weather for pivot coordinates', async () => {
      const res = await request(app.getHttpServer())
        .get(`/pivots/${pivotId}/weather`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      expect(res.body).toEqual({
        temperature: 25.5,
        humidity: 60,
        windSpeed: 12.3,
        conditions: 'Clear sky',
      });
      expect(httpService.get).toHaveBeenCalledTimes(1);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get(`/pivots/${pivotId}/weather`)
        .expect(401);
    });

    it('should return 404 for nonexistent pivot', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/pivots/${nonExistentId}/weather`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(404);
    });
  });
});
