import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { MqttProcessor } from '@/mqtt/mqtt.processor';
import { Job } from 'bullmq';

describe('MQTT Worker (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let processor: MqttProcessor;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    processor = app.get<MqttProcessor>(MqttProcessor);

    // Clean up database
    await prisma.cycle.deleteMany();
    await prisma.state.deleteMany();
    await prisma.pivot.deleteMany();
    await prisma.farm.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should process a full cycle: Power On -> Telemetry -> Power Off', async () => {
    // 1. Setup: Create a farm and a pivot
    const farm = await prisma.farm.create({
      data: {
        name: 'Test Farm',
        latitude: 10,
        longitude: 20,
      },
    });

    const pivot = await prisma.pivot.create({
      data: {
        id: 'pivot-e2e',
        name: 'Pivot E2E',
        farmId: farm.id,
        latitude: 10,
        longitude: 20,
        bladeAt100: 10,
        status: {},
      },
    });

    const receivedAt = new Date();

    // 2. Power On Packet
    const powerOnPayload = JSON.stringify({
      isOn: true,
      direction: 'clockwise',
      isIrrigating: true,
    });

    await processor.process({
      data: {
        pivotId: pivot.id,
        rawPayload: powerOnPayload,
        receivedAt: receivedAt.toISOString(),
      },
    } as Job);

    // Verify State created
    const state = await prisma.state.findFirst({
      where: { pivotId: pivot.id, isOn: true },
    });
    expect(state).toBeDefined();
    expect(state?.direction).toBe('clockwise');
    expect(state?.isIrrigating).toBe(true);

    // Verify Pivot status updated
    const updatedPivot1 = await prisma.pivot.findUnique({
      where: { id: pivot.id },
    });
    expect(updatedPivot1?.status).toEqual(JSON.parse(powerOnPayload));

    // 3. Telemetry Packet
    const telemetryPayload = JSON.stringify({
      angle: 180,
      percentimeter: 50,
      // isOn is missing, should still be active
    });

    await processor.process({
      data: {
        pivotId: pivot.id,
        rawPayload: telemetryPayload,
        receivedAt: new Date(receivedAt.getTime() + 1000).toISOString(),
      },
    } as Job);

    // Verify Cycle record created
    const cycle = await prisma.cycle.findFirst({
      where: { stateId: state?.id },
      orderBy: { timestamp: 'desc' },
    });
    expect(cycle).toBeDefined();
    expect(cycle?.angle).toBe(180);
    expect(cycle?.percentimeter).toBe(50);

    // 4. Power Off Packet
    const powerOffPayload = JSON.stringify({
      isOn: false,
    });

    await processor.process({
      data: {
        pivotId: pivot.id,
        rawPayload: powerOffPayload,
        receivedAt: new Date(receivedAt.getTime() + 2000).toISOString(),
      },
    } as Job);

    // Verify State closed
    const closedState = await prisma.state.findUnique({
      where: { id: state?.id },
    });
    expect(closedState?.isOn).toBe(false);

    // Verify Pivot status updated
    const updatedPivot2 = await prisma.pivot.findUnique({
      where: { id: pivot.id },
    });
    expect(updatedPivot2?.status).toEqual(JSON.parse(powerOffPayload));
  });

  it('should handle malformed packets without crashing', async () => {
    await processor.process({
      data: {
        pivotId: 'non-existent',
        rawPayload: '{ invalid',
        receivedAt: new Date().toISOString(),
      },
    } as Job);
    // Success if no exception thrown
  });
});
