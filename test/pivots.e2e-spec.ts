import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { Role } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';

describe('Pivots (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let adminToken: string;
  let operatorToken: string;
  let viewerToken: string;

  let farmId: string;
  let pivotId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);

    // Clean up database
    await prisma.pivot.deleteMany();
    await prisma.farm.deleteMany();
    await prisma.user.deleteMany();

    // Create test users and tokens
    const adminUser = await prisma.user.create({
      data: { email: 'admin@pivots.com', name: 'Admin', password: 'password', role: Role.ADMIN },
    });
    adminToken = jwtService.sign({ sub: adminUser.id, email: adminUser.email, role: adminUser.role });

    const operatorUser = await prisma.user.create({
      data: { email: 'operator@pivots.com', name: 'Operator', password: 'password', role: Role.OPERATOR },
    });
    operatorToken = jwtService.sign({ sub: operatorUser.id, email: operatorUser.email, role: operatorUser.role });

    const viewerUser = await prisma.user.create({
      data: { email: 'viewer@pivots.com', name: 'Viewer', password: 'password', role: Role.VIEWER },
    });
    viewerToken = jwtService.sign({ sub: viewerUser.id, email: viewerUser.email, role: viewerUser.role });

    // Create a farm for testing pivots
    const farm = await prisma.farm.create({
      data: { name: 'Pivot Test Farm', latitude: -15.78, longitude: -47.93 },
    });
    farmId = farm.id;
  });

  afterAll(async () => {
    await prisma.pivot.deleteMany();
    await prisma.farm.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('POST /farms/:farmId/pivots', () => {
    const createDto = {
      name: 'Central Pivot 1',
      latitude: -15.7801,
      longitude: -47.9292,
      bladeAt100: 25.5,
    };

    it('should allow ADMIN to create a pivot', async () => {
      const res = await request(app.getHttpServer())
        .post(`/farms/${farmId}/pivots`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createDto)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe(createDto.name);
      expect(res.body.farmId).toBe(farmId);
      expect(res.body).toHaveProperty('status');
      pivotId = res.body.id;
    });

    it('should allow OPERATOR to create a pivot', async () => {
      await request(app.getHttpServer())
        .post(`/farms/${farmId}/pivots`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ ...createDto, name: 'Operator Pivot' })
        .expect(201);
    });

    it('should return 403 for VIEWER attempting to create a pivot', async () => {
      await request(app.getHttpServer())
        .post(`/farms/${farmId}/pivots`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send(createDto)
        .expect(403);
    });

    it('should return 401 for request without token', async () => {
      await request(app.getHttpServer())
        .post(`/farms/${farmId}/pivots`)
        .send(createDto)
        .expect(401);
    });

    it('should return 404 for nonexistent farmId', async () => {
      const nonExistentFarmId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .post(`/farms/${nonExistentFarmId}/pivots`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createDto)
        .expect(404);
    });

    it('should return 400 for invalid input (bladeAt100 negative)', async () => {
      await request(app.getHttpServer())
        .post(`/farms/${farmId}/pivots`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...createDto, bladeAt100: -10 })
        .expect(400);
    });

    it('should return 400 for invalid latitude/longitude', async () => {
      await request(app.getHttpServer())
        .post(`/farms/${farmId}/pivots`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...createDto, latitude: 100, longitude: 200 })
        .expect(400);
    });
  });

  describe('GET /farms/:farmId/pivots', () => {
    it('should allow any authenticated user to list pivots for a farm', async () => {
      const res = await request(app.getHttpServer())
        .get(`/farms/${farmId}/pivots`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty('status');
    });

    it('should return 404 for list pivots of nonexistent farm', async () => {
      const nonExistentFarmId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/farms/${nonExistentFarmId}/pivots`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('GET /pivots/:id', () => {
    it('should allow any authenticated user to get pivot by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/pivots/${pivotId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      expect(res.body.id).toBe(pivotId);
      expect(res.body).toHaveProperty('status');
    });

    it('should return 404 for nonexistent pivot', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/pivots/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /pivots/:id', () => {
    it('should allow ADMIN to update a pivot', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/pivots/${pivotId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Pivot Name' })
        .expect(200);

      expect(res.body.name).toBe('Updated Pivot Name');
    });

    it('should allow OPERATOR to update a pivot', async () => {
      await request(app.getHttpServer())
        .patch(`/pivots/${pivotId}`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ name: 'Updated by Operator' })
        .expect(200);
    });

    it('should return 403 for VIEWER attempting to update a pivot', async () => {
      await request(app.getHttpServer())
        .patch(`/pivots/${pivotId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: 'Viewer Try' })
        .expect(403);
    });
  });

  describe('DELETE /pivots/:id', () => {
    it('should return 403 for OPERATOR attempting to delete a pivot', async () => {
      await request(app.getHttpServer())
        .delete(`/pivots/${pivotId}`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(403);
    });

    it('should allow ADMIN to delete a pivot', async () => {
      await request(app.getHttpServer())
        .delete(`/pivots/${pivotId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify it's gone
      await request(app.getHttpServer())
        .get(`/pivots/${pivotId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
