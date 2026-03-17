import { Test, TestingModule } from '@nestjs/testing';
import { PrismaE2EService } from './helpers/prisma-e2e.service';
import { Role } from '@prisma/client';

describe('Prisma Schema (Integration)', () => {
  let prisma: PrismaE2EService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaE2EService],
    }).compile();

    prisma = module.get<PrismaE2EService>(PrismaE2EService);
  });

  beforeEach(async () => {
    // Clear the database in correct order
    await prisma.cycle.deleteMany();
    await prisma.state.deleteMany();
    await prisma.pivot.deleteMany();
    await prisma.farm.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create a complete Farm → Pivot → State → Cycle chain', async () => {
    // 1. Create Farm
    const farm = await prisma.farm.create({
      data: {
        name: 'Test Farm',
        latitude: -15.7801,
        longitude: -47.9292,
      },
    });
    expect(farm.id).toBeDefined();

    // 2. Create Pivot
    const pivot = await prisma.pivot.create({
      data: {
        farmId: farm.id,
        name: 'Pivot 1',
        latitude: -15.7802,
        longitude: -47.9293,
        status: { power: true, angle: 180 },
        bladeAt100: 10.5,
      },
    });
    expect(pivot.id).toBeDefined();
    expect(pivot.farmId).toBe(farm.id);

    // 3. Create State
    const state = await prisma.state.create({
      data: {
        pivotId: pivot.id,
        timestamp: new Date(),
        isOn: true,
        direction: 'CLOCKWISE',
        isIrrigating: true,
      },
    });
    expect(state.id).toBeDefined();
    expect(state.pivotId).toBe(pivot.id);

    // 4. Create Cycle
    const cycle = await prisma.cycle.create({
      data: {
        stateId: state.id,
        timestamp: new Date(),
        angle: 45.5,
        percentimeter: 50.0,
      },
    });
    expect(cycle.id).toBeDefined();
    expect(cycle.stateId).toBe(state.id);

    // Verify relations via query
    const farmWithDetails = await prisma.farm.findUnique({
      where: { id: farm.id },
      include: {
        pivots: {
          include: {
            states: {
              include: {
                cycles: true,
              },
            },
          },
        },
      },
    });

    expect(farmWithDetails?.pivots[0].name).toBe('Pivot 1');
    expect(farmWithDetails?.pivots[0].states[0].isOn).toBe(true);
    expect(farmWithDetails?.pivots[0].states[0].cycles[0].angle).toBe(45.5);
  });

  it('should create a User with Role', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
        role: Role.ADMIN,
      },
    });
    expect(user.id).toBeDefined();
    expect(user.role).toBe(Role.ADMIN);
  });

  it('should cascade delete Pivot when Farm is deleted', async () => {
    const farm = await prisma.farm.create({
      data: {
        name: 'Cascade Farm',
        latitude: 0,
        longitude: 0,
      },
    });

    await prisma.pivot.create({
      data: {
        farmId: farm.id,
        name: 'Pivot to be deleted',
        latitude: 0,
        longitude: 0,
        status: {},
        bladeAt100: 5.0,
      },
    });

    await prisma.farm.delete({ where: { id: farm.id } });

    const pivotCount = await prisma.pivot.count({
      where: { farmId: farm.id },
    });
    expect(pivotCount).toBe(0);
  });

  it('should fail when creating a Pivot with missing farmId', async () => {
    await expect(
      prisma.pivot.create({
        data: {
          name: 'Orphan Pivot',
          latitude: 0,
          longitude: 0,
          status: {},
          bladeAt100: 5.0,
        } as any, // reason: testing runtime failure with invalid data
      }),
    ).rejects.toThrow();
  });
});
