import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateUserDto } from '@/auth/dto/create-user.dto';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authToken: string;
  let userId: string;

  const testUser: CreateUserDto = {
    name: 'E2E User',
    email: 'e2e-user@example.com',
    password: 'Password123',
  };

  beforeAll(async () => {
    console.log(
      'e2e test (users): process.env.DATABASE_URL =',
      process.env.DATABASE_URL,
    );
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prismaService = app.get<PrismaService>(PrismaService);

    // Clean up existing test users
    await prismaService.user.deleteMany({
      where: { email: { in: [testUser.email, 'e2e-user-update@example.com'] } },
    });

    // Register a test user and obtain auth token
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(201);
    userId = registerRes.body.id;

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(200);
    authToken = loginRes.body.access_token;
  });

  afterAll(async () => {
    // Clean up test user
    await prismaService.user.deleteMany({
      where: {
        email: {
          in: [
            testUser.email,
            'e2e-user-update@example.com',
            'post-user-test@example.com',
          ],
        },
      },
    });
    await app.close();
  });

  describe('POST /users', () => {
    const newUserDto: CreateUserDto = {
      name: 'Post User Test',
      email: 'post-user-test@example.com',
      password: 'Password123',
    };

    // Happy path
    it('should return 201 and the created user', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newUserDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('name', newUserDto.name);
          expect(res.body).toHaveProperty('email', newUserDto.email);
          expect(res.body).not.toHaveProperty('password');
        });
    });

    // Error path: Invalid DTO
    it('should return 400 for invalid DTO', () => {
      const invalidUserDto = {
        name: 'Invalid User',
        email: 'invalid-email', // Invalid email format
        password: '123', // Too short password
      };
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUserDto)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toEqual(
            expect.arrayContaining([
              'email must be an email',
              'password must be longer than or equal to 6 characters',
            ]),
          );
        });
    });

    // Error path: Duplicate email
    it('should return 409 for duplicate email', async () => {
      // First create the user
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newUserDto)
        .expect(201);

      // Try to create again with the same email
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newUserDto)
        .expect(409);
    });

    // Error path: Unauthorized
    it('should return 401 without a token', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send(newUserDto)
        .expect(401);
    });
  });

  describe('GET /users', () => {
    // Happy path
    it('should return 200 and an array of users', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('email');
          expect(res.body[0]).not.toHaveProperty('password');
        });
    });

    // Error path: Unauthorized
    it('should return 401 without a token', () => {
      return request(app.getHttpServer()).get('/users').expect(401);
    });
  });

  describe('GET /users/:id', () => {
    // Happy path
    it('should return 200 and a single user', () => {
      return request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', userId);
          expect(res.body).toHaveProperty('email', testUser.email);
          expect(res.body).not.toHaveProperty('password');
        });
    });

    // Error path: Unauthorized
    it('should return 401 without a token', () => {
      return request(app.getHttpServer()).get(`/users/${userId}`).expect(401);
    });

    // Error path: Not Found
    it('should return 404 for a non-existent user ID', () => {
      const nonExistentId = 'a1b2c3d4-e5f6-7890-1234-567890abcdef'; // Example UUID
      return request(app.getHttpServer())
        .get(`/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PATCH /users/:id', () => {
    // Happy path
    it('should return 200 and the updated user', () => {
      const updateData = { name: 'Updated E2E User' };
      return request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', userId);
          expect(res.body).toHaveProperty('name', updateData.name);
          expect(res.body).not.toHaveProperty('password');
        });
    });

    // Error path: Unauthorized
    it('should return 401 without a token', () => {
      return request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .send({ name: 'Unauthorized Update' })
        .expect(401);
    });

    // Error path: Not Found
    it('should return 404 for a non-existent user ID', () => {
      const nonExistentId = 'a1b2c3d4-e5f6-7890-1234-567890abcdef'; // Example UUID
      return request(app.getHttpServer())
        .patch(`/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Non Existent' })
        .expect(404);
    });

    // Error path: Duplicate email
    it('should return 409 for duplicate email', async () => {
      // Create another user to cause a conflict
      await request(app.getHttpServer()).post('/auth/register').send({
        name: 'Another User',
        email: 'e2e-user-update@example.com',
        password: 'Password123',
      });

      return request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'e2e-user-update@example.com' })
        .expect(409);
    });
  });

  describe('DELETE /users/:id', () => {
    let userToDeleteId: string;
    let userToDeleteAuthToken: string;

    beforeEach(async () => {
      // Register a new user specifically for deletion test
      const newUser: CreateUserDto = {
        name: 'Delete User',
        email: 'delete-me@example.com',
        password: 'Password123',
      };
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send(newUser)
        .expect(201);
      userToDeleteId = registerRes.body.id;

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: newUser.email, password: newUser.password })
        .expect(200);
      userToDeleteAuthToken = loginRes.body.access_token;
    });

    // Happy path
    it('should return 200 and the removed user', () => {
      return request(app.getHttpServer())
        .delete(`/users/${userToDeleteId}`)
        .set('Authorization', `Bearer ${userToDeleteAuthToken}`) // Use the token of the user being deleted
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', userToDeleteId);
          expect(res.body).not.toHaveProperty('password');
        });
    });

    // Error path: Unauthorized
    it('should return 401 without a token', () => {
      return request(app.getHttpServer())
        .delete(`/users/${userToDeleteId}`)
        .expect(401);
    });

    // Error path: Not Found (after deletion)
    it('should return 404 if trying to delete a non-existent user ID', async () => {
      // Delete the user first
      await request(app.getHttpServer())
        .delete(`/users/${userToDeleteId}`)
        .set('Authorization', `Bearer ${userToDeleteAuthToken}`);

      // Try to delete again
      return request(app.getHttpServer())
        .delete(`/users/${userToDeleteId}`)
        .set('Authorization', `Bearer ${userToDeleteAuthToken}`)
        .expect(404);
    });
  });
});
