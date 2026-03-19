import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  Controller,
  Get,
  Post,
  Body,
  BadRequestException,
} from '@nestjs/common';
import request from 'supertest';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { PrismaExceptionFilter } from '@/common/filters/prisma-exception.filter';
import { Prisma } from '@prisma/client';
import { IsString, IsNotEmpty } from 'class-validator';

class TestDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

@Controller('error-test')
class ErrorTestController {
  @Get('http-exception')
  throwHttpException() {
    throw new BadRequestException('Custom message');
  }

  @Get('prisma-p2002')
  throwPrismaP2002() {
    throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '5.0.0',
    });
  }

  @Get('prisma-p2025')
  throwPrismaP2025() {
    throw new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '5.0.0',
    });
  }

  @Get('prisma-p2003')
  throwPrismaP2003() {
    throw new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
      code: 'P2003',
      clientVersion: '5.0.0',
    });
  }

  @Post('validation')
  testValidation(@Body() dto: TestDto) {
    return dto;
  }
}

describe('Error Handling (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ErrorTestController],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    app.useGlobalFilters(new HttpExceptionFilter(), new PrismaExceptionFilter());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should format HttpException via HttpExceptionFilter', () => {
    return request(app.getHttpServer())
      .get('/error-test/http-exception')
      .expect(400)
      .expect((res) => {
        // console.log('DEBUG: HttpExceptionFilter Response:', res.body);
        expect(res.body).toEqual(
          expect.objectContaining({
            statusCode: 400,
            message: 'Custom message',
            error: 'Bad Request',
            path: '/error-test/http-exception',
            timestamp: expect.any(String),
          }),
        );
        expect(Object.keys(res.body).sort()).toEqual(['statusCode', 'message', 'error', 'path', 'timestamp'].sort());
      });
  });

  it('should format Prisma P2002 via PrismaExceptionFilter', () => {
    return request(app.getHttpServer())
      .get('/error-test/prisma-p2002')
      .expect(409)
      .expect((res) => {
        expect(res.body).toEqual(
          expect.objectContaining({
            statusCode: 409,
            message: 'Unique constraint failed',
            error: 'Conflict',
            path: '/error-test/prisma-p2002',
            timestamp: expect.any(String),
          }),
        );
      });
  });

  it('should format Prisma P2025 via PrismaExceptionFilter', () => {
    return request(app.getHttpServer())
      .get('/error-test/prisma-p2025')
      .expect(404)
      .expect((res) => {
        expect(res.body).toEqual(
          expect.objectContaining({
            statusCode: 404,
            message: 'Record not found',
            error: 'Not Found',
            path: '/error-test/prisma-p2025',
            timestamp: expect.any(String),
          }),
        );
      });
  });

  it('should format Prisma P2003 via PrismaExceptionFilter', () => {
    return request(app.getHttpServer())
      .get('/error-test/prisma-p2003')
      .expect(400)
      .expect((res) => {
        expect(res.body).toEqual(
          expect.objectContaining({
            statusCode: 400,
            message: 'Foreign key constraint failed',
            error: 'Bad Request',
            path: '/error-test/prisma-p2003',
            timestamp: expect.any(String),
          }),
        );
      });
  });

  it('should return 400 Bad Request on validation error', () => {
    return request(app.getHttpServer())
      .post('/error-test/validation')
      .send({})
      .expect(400)
      .expect((res) => {
        expect(res.body).toEqual(
          expect.objectContaining({
            statusCode: 400,
            error: 'Bad Request',
            path: '/error-test/validation',
            timestamp: expect.any(String),
          }),
        );
        expect(res.body.message).toBeInstanceOf(Array);
      });
  });

  it('should reject extra fields via ValidationPipe', () => {
    return request(app.getHttpServer())
      .post('/error-test/validation')
      .send({ name: 'Valid Name', extra: 'field' })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toContain('property extra should not exist');
      });
  });
});
