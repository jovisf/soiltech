# Skill: Testing Patterns

## When to use

During the `[TESTER]` phase of every task.

## File naming

| Type      | Pattern         | Example                 |
| --------- | --------------- | ----------------------- |
| Unit test | `*.spec.ts`     | `farms.service.spec.ts` |
| E2E test  | `*.e2e-spec.ts` | `farms.e2e-spec.ts`     |

## Jest configuration

Tests run via the pre-configured NestJS Jest setup:

- Unit: `npm run test`
- E2E: `npm run test:e2e`
- Coverage: `npm run test:cov`

## Mocking PrismaService

Create a shared mock factory:

```typescript
// test/helpers/prisma-mock.ts
import { PrismaService } from "@/prisma/prisma.service";

export type MockPrismaService = {
  [K in keyof PrismaService]: jest.Mocked<Record<string, jest.Mock>>;
};

export function createMockPrismaService(): MockPrismaService {
  return {
    farm: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    pivot: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    // Add other models as needed
  } as unknown as MockPrismaService;
}
```

## Minimal unit test example

```typescript
// src/farms/farms.service.spec.ts
import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { FarmsService } from "./farms.service";
import { PrismaService } from "@/prisma/prisma.service";

describe("FarmsService", () => {
  let service: FarmsService;
  let prisma: {
    farm: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      farm: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [FarmsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<FarmsService>(FarmsService);
  });

  // Happy path
  describe("findAll", () => {
    it("should return an array of farms", async () => {
      const farms = [
        { id: "1", name: "Farm A", latitude: -23.5, longitude: -46.6 },
      ];
      prisma.farm.findMany.mockResolvedValue(farms);

      const result = await service.findAll();

      expect(result).toEqual(farms);
      expect(prisma.farm.findMany).toHaveBeenCalledTimes(1);
    });
  });

  // Error path
  describe("findOne", () => {
    it("should throw NotFoundException when farm not found", async () => {
      prisma.farm.findUnique.mockResolvedValue(null);

      await expect(service.findOne("nonexistent-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // Edge case
  describe("create", () => {
    it("should handle coordinates at boundary values", async () => {
      const dto = { name: "Edge Farm", latitude: 90, longitude: 180 };
      prisma.farm.create.mockResolvedValue({ id: "1", ...dto });

      const result = await service.create(dto);

      expect(result.latitude).toBe(90);
      expect(result.longitude).toBe(180);
    });
  });
});
```

## Mocking Redis / BullMQ

```typescript
// test/helpers/bull-mock.ts
export function createMockQueue() {
  return {
    add: jest.fn().mockResolvedValue({ id: "mock-job-id" }),
    process: jest.fn(),
    on: jest.fn(),
    close: jest.fn(),
  };
}
```

Use in test:

```typescript
import { getQueueToken } from "@nestjs/bullmq";

const module = await Test.createTestingModule({
  providers: [
    MqttService,
    { provide: getQueueToken("mqtt-queue"), useValue: createMockQueue() },
  ],
}).compile();
```

## E2E test with Supertest

```typescript
// test/farms.e2e-spec.ts
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "@/app.module";

describe("Farms (e2e)", () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    // Obtain auth token
    const loginRes = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "admin@soiltech.com", password: "password" });
    authToken = loginRes.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /farms — should return 200 with array", () => {
    return request(app.getHttpServer())
      .get("/farms")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it("GET /farms — should return 401 without token", () => {
    return request(app.getHttpServer()).get("/farms").expect(401);
  });
});
```

## Coverage requirements per task

| What              | Minimum                                      |
| ----------------- | -------------------------------------------- |
| Happy path        | Every public method                          |
| Error path        | Every public method                          |
| Edge case         | At least 1 per public method                 |
| HTTP status codes | 200, 201, 400, 401, 403, 404 (as applicable) |
| Auth enforcement  | 401 without token, 403 with wrong role       |
