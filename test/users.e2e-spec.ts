import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateUserDto } from '@/users/dto/create-user.dto';
import { Role } from '@prisma/client';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let adminToken: string;
  let operatorToken: string;
  let viewerToken: string;
  let adminId: string;
  let operatorId: string;
  let viewerId: string;

  const adminUser: CreateUserDto = {
    name: 'Admin User',
    email: 'admin-e2e@example.com',
    password: 'Password123',
  };

  const operatorUser: CreateUserDto = {
    name: 'Operator User',
    email: 'operator-e2e@example.com',
    password: 'Password123',
  };

  const viewerUser: CreateUserDto = {
    name: 'Viewer User',
    email: 'viewer-e2e@example.com',
    password: 'Password123',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prismaService = app.get<PrismaService>(PrismaService);

    // Clean up
    await prismaService.user.deleteMany({
      where: {
        email: {
          in: [
            adminUser.email,
            operatorUser.email,
            viewerUser.email,
            'new-user-e2e@example.com',
            'update-user-e2e@example.com',
          ],
        },
      },
    });

    // Setup Admin
    const adminReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send(adminUser)
      .expect(201);
    adminId = adminReg.body.id;
    await prismaService.user.update({
      where: { id: adminId },
      data: { role: Role.ADMIN },
    });
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminUser.email, password: adminUser.password })
      .expect(201);
    adminToken = adminLogin.body.access_token;

    // Setup Operator
    const operatorReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send(operatorUser)
      .expect(201);
    operatorId = operatorReg.body.id;
    await prismaService.user.update({
      where: { id: operatorId },
      data: { role: Role.OPERATOR },
    });
    const operatorLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: operatorUser.email, password: operatorUser.password })
      .expect(201);
    operatorToken = operatorLogin.body.access_token;

    // Setup Viewer
    const viewerReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send(viewerUser)
      .expect(201);
    viewerId = viewerReg.body.id;
    // Default role is VIEWER
    const viewerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: viewerUser.email, password: viewerUser.password })
      .expect(201);
    viewerToken = viewerLogin.body.access_token;
  });

  afterAll(async () => {
    await prismaService.user.deleteMany({
      where: {
        email: {
          in: [
            adminUser.email,
            operatorUser.email,
            viewerUser.email,
            'new-user-e2e@example.com',
            'update-user-e2e@example.com',
          ],
        },
      },
    });
    await app.close();
  });

  describe('GET /users/me', () => {
    it('should return the current user profile (admin)', () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(adminId);
          expect(res.body.email).toBe(adminUser.email);
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should return the current user profile (viewer)', () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(viewerId);
          expect(res.body.email).toBe(viewerUser.email);
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer()).get('/users/me').expect(401);
    });
  });

  describe('Admin Routes Protection (RBAC)', () => {
    const newUser = {
      name: 'New User',
      email: 'new-user-e2e@example.com',
      password: 'Password123',
    };

    it('should forbid operator from creating users', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(newUser)
        .expect(403);
    });

    it('should forbid viewer from listing users', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });

    it('should forbid operator from deleting users', () => {
      return request(app.getHttpServer())
        .delete(`/users/${viewerId}`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(403);
    });
  });

  describe('POST /users', () => {
    it('should create a user (admin only)', () => {
      const newUser = {
        name: 'New User',
        email: 'new-user-e2e@example.com',
        password: 'Password123',
        role: Role.OPERATOR,
      };
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser)
        .expect(201)
        .expect((res) => {
          expect(res.body.email).toBe(newUser.email);
          expect(res.body.role).toBe(Role.OPERATOR);
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should return 400 for invalid email', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test', email: 'invalid', password: '123' })
        .expect(400);
    });
  });

  describe('GET /users', () => {
    it('should return list of users (admin only)', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(3);
          res.body.forEach((u: any) =>
            expect(u).not.toHaveProperty('password'),
          );
        });
    });
  });

  describe('GET /users/:id', () => {
    it('should return user by id (admin only)', () => {
      return request(app.getHttpServer())
        .get(`/users/${operatorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(operatorId);
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should return 400 for invalid UUID', () => {
      return request(app.getHttpServer())
        .get('/users/not-a-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should return 404 for non-existent user', () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      return request(app.getHttpServer())
        .get(`/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /users/:id', () => {
    it('should update user (admin only)', () => {
      return request(app.getHttpServer())
        .patch(`/users/${operatorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Operator' })
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Updated Operator');
        });
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete user (admin only)', async () => {
      // Create a user to delete
      const userToDelete = await prismaService.user.create({
        data: {
          name: 'To Delete',
          email: 'delete@example.com',
          password: 'hashed',
        },
      });

      await request(app.getHttpServer())
        .delete(`/users/${userToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify it's gone
      const found = await prismaService.user.findUnique({
        where: { id: userToDelete.id },
      });
      expect(found).toBeNull();
    });
  });
});
