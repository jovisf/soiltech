import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '@/auth/dto/create-user.dto';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authToken: string;

  const testUser: CreateUserDto = {
    name: 'Test User',
    email: 'e2e@example.com',
    password: 'Password123',
  };

  beforeAll(async () => {
    console.log('e2e test (auth): process.env.DATABASE_URL =', process.env.DATABASE_URL);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prismaService = app.get<PrismaService>(PrismaService);

    // Clean up test user if it exists from a previous failed run
    await prismaService.user.deleteMany({ where: { email: testUser.email } });

    // Register a test user and obtain auth token for subsequent tests
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(200);

    authToken = loginRes.body.access_token;
  });

  afterAll(async () => {
    // Clean up test user
    await prismaService.user.deleteMany({ where: { email: testUser.email } });
    await app.close();
  });

  describe('POST /auth/register', () => {
    // This happy path is covered in beforeAll
    it('should return 201 for successful registration (covered in beforeAll)', () => {
      // This test case is primarily to confirm the setup in beforeAll works
      expect(authToken).toBeDefined();
    });

    // Error path: Invalid input
    it('should return 400 for invalid input (missing email)', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Invalid User', password: 'Password123' })
        .expect(400);
    });

    // Error path: Duplicate email
    it('should return 409 for duplicate email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser) // Attempt to register the same user again
        .expect(409);
    });
  });

  describe('POST /auth/login', () => {
    // This happy path is covered in beforeAll
    it('should return 200 and an access token for successful login (covered in beforeAll)', () => {
      // This test case is primarily to confirm the setup in beforeAll works
      expect(authToken).toBeDefined();
    });

    // Error path: Invalid credentials (wrong password)
    it('should return 401 for invalid credentials (wrong password)', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: 'WrongPassword' })
        .expect(401);
    });

    // Error path: Invalid credentials (user not found)
    it('should return 401 for invalid credentials (user not found)', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'Password123' })
        .expect(401);
    });

    // Error path: Invalid input (missing password)
    it('should return 400 for invalid input (missing password)', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email })
        .expect(400);
    });
  });
});
