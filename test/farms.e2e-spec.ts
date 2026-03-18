import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { Role } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';

describe('Farms (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  
  let adminToken: string;
  let operatorToken: string;
  let viewerToken: string;
  
  let farmId: string;

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
      data: { email: 'admin@test.com', name: 'Admin', password: 'password', role: Role.ADMIN },
    });
    adminToken = jwtService.sign({ sub: adminUser.id, email: adminUser.email, role: adminUser.role });

    const operatorUser = await prisma.user.create({
      data: { email: 'operator@test.com', name: 'Operator', password: 'password', role: Role.OPERATOR },
    });
    operatorToken = jwtService.sign({ sub: operatorUser.id, email: operatorUser.email, role: operatorUser.role });

    const viewerUser = await prisma.user.create({
      data: { email: 'viewer@test.com', name: 'Viewer', password: 'password', role: Role.VIEWER },
    });
    viewerToken = jwtService.sign({ sub: viewerUser.id, email: viewerUser.email, role: viewerUser.role });
  });

  afterAll(async () => {
    await prisma.pivot.deleteMany();
    await prisma.farm.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('POST /farms', () => {
    const createDto = {
      name: 'Test Farm',
      latitude: -15.7801,
      longitude: -47.9292,
    };

    it('should allow ADMIN to create a farm', async () => {
      const res = await request(app.getHttpServer())
        .post('/farms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createDto)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe(createDto.name);
      farmId = res.body.id;
    });

    it('should allow OPERATOR to create a farm', async () => {
      await request(app.getHttpServer())
        .post('/farms')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ ...createDto, name: 'Operator Farm' })
        .expect(201);
    });

    it('should return 403 for VIEWER attempting to create a farm', async () => {
      await request(app.getHttpServer())
        .post('/farms')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send(createDto)
        .expect(403);
    });

    it('should return 401 for request without token', async () => {
      await request(app.getHttpServer())
        .post('/farms')
        .send(createDto)
        .expect(401);
    });

    it('should return 400 for invalid input (missing name)', async () => {
      await request(app.getHttpServer())
        .post('/farms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ latitude: 0, longitude: 0 })
        .expect(400);
    });

    it('should return 400 for invalid coordinates (latitude out of range)', async () => {
      await request(app.getHttpServer())
        .post('/farms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Invalid', latitude: 100, longitude: 0 })
        .expect(400);
    });
  });

  describe('GET /farms', () => {
    it('should allow any authenticated user to list farms', async () => {
      const res = await request(app.getHttpServer())
        .get('/farms')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /farms/:id', () => {
    it('should allow any authenticated user to get farm by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/farms/${farmId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      expect(res.body.id).toBe(farmId);
      expect(res.body).toHaveProperty('pivots');
    });

    it('should return 404 for nonexistent farm', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/farms/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      await request(app.getHttpServer())
        .get('/farms/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('PATCH /farms/:id', () => {
    it('should allow ADMIN to update a farm', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/farms/${farmId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(res.body.name).toBe('Updated Name');
    });

    it('should allow OPERATOR to update a farm', async () => {
      await request(app.getHttpServer())
        .patch(`/farms/${farmId}`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ name: 'Updated by Operator' })
        .expect(200);
    });

    it('should return 403 for VIEWER attempting to update a farm', async () => {
      await request(app.getHttpServer())
        .patch(`/farms/${farmId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: 'Viewer Try' })
        .expect(403);
    });
  });

  describe('DELETE /farms/:id', () => {
    it('should return 403 for OPERATOR attempting to delete a farm', async () => {
      await request(app.getHttpServer())
        .delete(`/farms/${farmId}`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(403);
    });

    it('should allow ADMIN to delete a farm', async () => {
      await request(app.getHttpServer())
        .delete(`/farms/${farmId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify it's gone
      await request(app.getHttpServer())
        .get(`/farms/${farmId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
