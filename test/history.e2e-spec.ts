import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { Role } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';

describe('History Endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let viewerToken: string;
  let farmId: string;
  let pivotId: string;
  let stateIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);

    // Clean up database
    await prisma.cycle.deleteMany();
    await prisma.state.deleteMany();
    await prisma.pivot.deleteMany();
    await prisma.farm.deleteMany();
    await prisma.user.deleteMany();

    // Create test user and token
    const viewerUser = await prisma.user.create({
      data: {
        email: 'viewer@history.com',
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

    // Seed data
    const farm = await prisma.farm.create({
      data: { name: 'History Farm', latitude: 0, longitude: 0 },
    });
    farmId = farm.id;

    const pivot = await prisma.pivot.create({
      data: {
        name: 'History Pivot',
        farmId: farmId,
        latitude: 0,
        longitude: 0,
        bladeAt100: 10,
        status: {},
      },
    });
    pivotId = pivot.id;

    // Create 25 states (to test pagination)
    for (let i = 0; i < 25; i++) {
      const state = await prisma.state.create({
        data: {
          pivotId: pivotId,
          timestamp: new Date(Date.now() - i * 1000 * 60 * 60), // Each 1 hour apart
          isOn: true,
          direction: 'CLOCKWISE',
          isIrrigating: true,
        },
      });
      stateIds.push(state.id);
    }

    // Create 5 cycles for the first state
    for (let i = 0; i < 5; i++) {
      await prisma.cycle.create({
        data: {
          stateId: stateIds[0],
          timestamp: new Date(Date.now() - i * 1000 * 60), // Each 1 minute apart
          angle: i * 10,
          percentimeter: 100,
        },
      });
    }
  });

  afterAll(async () => {
    await prisma.cycle.deleteMany();
    await prisma.state.deleteMany();
    await prisma.pivot.deleteMany();
    await prisma.farm.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('GET /pivots/:id/states', () => {
    it('should allow any authenticated user to list states', async () => {
      const res = await request(app.getHttpServer())
        .get(`/pivots/${pivotId}/states`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('total', 25);
      expect(res.body).toHaveProperty('page', 1);
      expect(res.body).toHaveProperty('limit', 20);
      expect(res.body.data).toHaveLength(20);
      expect(new Date(res.body.data[0].timestamp).getTime()).toBeGreaterThan(
        new Date(res.body.data[1].timestamp).getTime(),
      );
    });

    it('should respect pagination parameters', async () => {
      const res = await request(app.getHttpServer())
        .get(`/pivots/${pivotId}/states?page=2&limit=10`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      expect(res.body.page).toBe(2);
      expect(res.body.limit).toBe(10);
      expect(res.body.data).toHaveLength(10);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get(`/pivots/${pivotId}/states`)
        .expect(401);
    });

    it('should return 404 for nonexistent pivot', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/pivots/${nonExistentId}/states`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(404);
    });

    it('should return 400 for invalid pagination parameters', async () => {
      await request(app.getHttpServer())
        .get(`/pivots/${pivotId}/states?page=0`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(400);
    });
  });

  describe('GET /pivots/:id/states/:stateId/cycles', () => {
    it('should allow any authenticated user to list cycles', async () => {
      const res = await request(app.getHttpServer())
        .get(`/pivots/${pivotId}/states/${stateIds[0]}/cycles`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('total', 5);
      expect(res.body.data).toHaveLength(5);
    });

    it('should return 404 if state does not belong to pivot', async () => {
      const otherPivot = await prisma.pivot.create({
        data: {
          name: 'Other Pivot',
          farmId: farmId,
          latitude: 0,
          longitude: 0,
          bladeAt100: 10,
          status: {},
        },
      });

      await request(app.getHttpServer())
        .get(`/pivots/${otherPivot.id}/states/${stateIds[0]}/cycles`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(404);
    });

    it('should return empty data for page beyond total', async () => {
      const res = await request(app.getHttpServer())
        .get(`/pivots/${pivotId}/states/${stateIds[0]}/cycles?page=2`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(0);
      expect(res.body.total).toBe(5);
    });
  });
});
