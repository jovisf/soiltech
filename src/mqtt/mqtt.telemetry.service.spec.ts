import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { MqttTelemetryService } from './mqtt.telemetry.service';
import { PrismaService } from '@/prisma/prisma.service';
import { WebsocketGateway } from '@/websocket/websocket.gateway';

describe('MqttTelemetryService', () => {
  let service: MqttTelemetryService;
  let prisma: any;
  let wsGateway: {
    emitPivotUpdate: jest.Mock;
  };
  let txClient: any;

  beforeEach(async () => {
    txClient = {
      pivot: {
        update: jest.fn(),
      },
      state: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      cycle: {
        create: jest.fn(),
      },
    };

    prisma = {
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return await callback(txClient);
      }),
    };

    wsGateway = {
      emitPivotUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MqttTelemetryService,
        { provide: PrismaService, useValue: prisma },
        { provide: WebsocketGateway, useValue: wsGateway },
      ],
    }).compile();

    service = module.get<MqttTelemetryService>(MqttTelemetryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processTelemetry', () => {
    const pivotId = 'pivot-1';
    const timestamp = new Date();

    it('should create a new active state when none exists (Power On)', async () => {
      const payload = {
        isOn: true,
        direction: 'clockwise',
        isIrrigating: true,
        angle: 45,
        percentimeter: 100,
      };

      txClient.state.findFirst.mockResolvedValue(null);
      txClient.state.create.mockResolvedValue({
        id: 'state-1',
        pivotId,
        isOn: true,
      });

      await service.processTelemetry(pivotId, payload, timestamp);

      // Verify Pivot update
      expect(txClient.pivot.update).toHaveBeenCalledWith({
        where: { id: pivotId },
        data: { status: payload },
      });

      // Verify State creation
      expect(txClient.state.create).toHaveBeenCalledWith({
        data: {
          pivotId,
          isOn: true,
          timestamp,
          direction: 'clockwise',
          isIrrigating: true,
        },
      });

      // Verify Cycle creation
      expect(txClient.cycle.create).toHaveBeenCalledWith({
        data: {
          stateId: 'state-1',
          timestamp,
          angle: 45,
          percentimeter: 100,
        },
      });

      // Verify WS emission
      expect(wsGateway.emitPivotUpdate).toHaveBeenCalledWith(pivotId, payload);
    });

    it('should update existing active state metadata and record cycle (Telemetry)', async () => {
      const payload = {
        isOn: true,
        direction: 'counter-clockwise',
        isIrrigating: true,
        angle: 90,
      };
      const activeState = {
        id: 'state-1',
        pivotId,
        isOn: true,
        direction: 'clockwise',
        isIrrigating: false,
      };

      txClient.state.findFirst.mockResolvedValue(activeState);

      await service.processTelemetry(pivotId, payload, timestamp);

      // Verify State update
      expect(txClient.state.update).toHaveBeenCalledWith({
        where: { id: 'state-1' },
        data: {
          direction: 'counter-clockwise',
          isIrrigating: true,
        },
      });

      // Verify Cycle creation
      expect(txClient.cycle.create).toHaveBeenCalledWith({
        data: {
          stateId: 'state-1',
          timestamp,
          angle: 90,
          percentimeter: 0, // Default value
        },
      });

      expect(wsGateway.emitPivotUpdate).toHaveBeenCalledWith(pivotId, payload);
    });

    it('should close active state and update pivot status (Power Off)', async () => {
      const payload = { isOn: false };
      txClient.state.updateMany.mockResolvedValue({ count: 1 });

      await service.processTelemetry(pivotId, payload, timestamp);

      // Verify Power Off handling
      expect(txClient.state.updateMany).toHaveBeenCalledWith({
        where: { pivotId, isOn: true },
        data: { isOn: false },
      });

      // Should not create a cycle or update state metadata when power is off
      expect(txClient.state.update).not.toHaveBeenCalled();
      expect(txClient.cycle.create).not.toHaveBeenCalled();

      expect(wsGateway.emitPivotUpdate).toHaveBeenCalledWith(pivotId, payload);
    });

    it('should treat missing isOn field as active state (Edge Case)', async () => {
      const payload = { angle: 180 }; // isOn missing
      txClient.state.findFirst.mockResolvedValue({ id: 'state-1' });

      await service.processTelemetry(pivotId, payload, timestamp);

      expect(txClient.state.findFirst).toHaveBeenCalled();
      expect(txClient.cycle.create).toHaveBeenCalled();
    });

    it('should handle missing optional fields with defaults (Edge Case)', async () => {
      const payload = { isOn: true }; // Only isOn provided
      txClient.state.findFirst.mockResolvedValue(null);
      txClient.state.create.mockResolvedValue({ id: 'state-1' });

      await service.processTelemetry(pivotId, payload, timestamp);

      expect(txClient.state.create).toHaveBeenCalledWith({
        data: {
          pivotId,
          isOn: true,
          timestamp,
          direction: 'clockwise', // Default
          isIrrigating: false, // Default from Boolean(undefined)
        },
      });

      expect(txClient.cycle.create).toHaveBeenCalledWith({
        data: {
          stateId: 'state-1',
          timestamp,
          angle: 0, // Default
          percentimeter: 0, // Default
        },
      });
    });

    it('should handle Power Off when no active state exists (Edge Case)', async () => {
      const payload = { isOn: false };
      txClient.state.updateMany.mockResolvedValue({ count: 0 });

      await service.processTelemetry(pivotId, payload, timestamp);

      expect(txClient.state.updateMany).toHaveBeenCalled();
      // Should not throw or crash
    });

    it('should propagate errors from database operations (Error Path)', async () => {
      const payload = { isOn: true };
      const dbError = new Error('Database connection lost');
      txClient.pivot.update.mockRejectedValue(dbError);

      await expect(
        service.processTelemetry(pivotId, payload, timestamp),
      ).rejects.toThrow(dbError);

      // WS should not be emitted if DB fails
      expect(wsGateway.emitPivotUpdate).not.toHaveBeenCalled();
    });
  });
});
