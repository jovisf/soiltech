import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MqttProcessor } from './mqtt.processor';
import { PrismaService } from '@/prisma/prisma.service';
import { MqttTelemetryService } from './mqtt.telemetry.service';
import { WebsocketGateway } from '@/websocket/websocket.gateway';

describe('MqttProcessor', () => {
  let processor: MqttProcessor;
  let prisma: {
    pivot: {
      count: jest.Mock;
    };
  };
  let telemetryService: {
    processTelemetry: jest.Mock;
  };
  let websocketGateway: {
    emitPivotUpdate: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      pivot: {
        count: jest.fn(),
      },
    };

    telemetryService = {
      processTelemetry: jest.fn(),
    };

    websocketGateway = {
      emitPivotUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MqttProcessor,
        { provide: PrismaService, useValue: prisma },
        { provide: MqttTelemetryService, useValue: telemetryService },
        { provide: WebsocketGateway, useValue: websocketGateway },
      ],
    }).compile();

    processor = module.get<MqttProcessor>(MqttProcessor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    const mockJob = {
      data: {
        pivotId: 'pivot-123',
        rawPayload: JSON.stringify({ isOn: true, angle: 90 }),
        receivedAt: new Date().toISOString(),
      },
    } as Job;

    it('should successfully process a valid telemetry packet and emit live update', async () => {
      prisma.pivot.count.mockResolvedValue(1);
      telemetryService.processTelemetry.mockResolvedValue(undefined);

      await processor.process(mockJob);

      expect(prisma.pivot.count).toHaveBeenCalledWith({
        where: { id: 'pivot-123' },
      });
      expect(telemetryService.processTelemetry).toHaveBeenCalledWith(
        'pivot-123',
        { isOn: true, angle: 90 },
        expect.any(Date),
      );
      expect(websocketGateway.emitPivotUpdate).toHaveBeenCalledWith(
        'pivot-123',
        { isOn: true, angle: 90 },
      );
    });

    it('should discard malformed JSON packets and log an error', async () => {
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      const malformedJob = {
        data: {
          pivotId: 'pivot-123',
          rawPayload: '{ invalid json }',
          receivedAt: new Date().toISOString(),
        },
      } as Job;

      await processor.process(malformedJob);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Malformed packet'),
      );
      expect(prisma.pivot.count).not.toHaveBeenCalled();
      expect(telemetryService.processTelemetry).not.toHaveBeenCalled();

      loggerSpy.mockRestore();
    });

    it('should discard packets for non-existent pivots and log a warning', async () => {
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation();
      prisma.pivot.count.mockResolvedValue(0);

      await processor.process(mockJob);

      expect(prisma.pivot.count).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Discarding packet for non-existent pivot'),
      );
      expect(telemetryService.processTelemetry).not.toHaveBeenCalled();

      loggerSpy.mockRestore();
    });

    it('should log error and re-throw if telemetryService fails', async () => {
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      prisma.pivot.count.mockResolvedValue(1);
      const error = new Error('Database connection failed');
      telemetryService.processTelemetry.mockRejectedValue(error);

      await expect(processor.process(mockJob)).rejects.toThrow(error);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to process telemetry'),
      );

      loggerSpy.mockRestore();
    });

    it('should handle edge case: invalid receivedAt date string', async () => {
      // Date constructor in JS handles invalid strings by returning an "Invalid Date" object.
      // We should verify that it still passes a Date object to the service.
      const invalidDateJob = {
        data: {
          pivotId: 'pivot-123',
          rawPayload: JSON.stringify({ isOn: true }),
          receivedAt: 'not-a-date',
        },
      } as Job;

      prisma.pivot.count.mockResolvedValue(1);
      telemetryService.processTelemetry.mockResolvedValue(undefined);

      await processor.process(invalidDateJob);

      expect(telemetryService.processTelemetry).toHaveBeenCalledWith(
        'pivot-123',
        { isOn: true },
        expect.any(Date),
      );

      const passedDate = telemetryService.processTelemetry.mock.calls[0][2];
      expect(passedDate.toString()).toBe('Invalid Date');
    });
  });
});
