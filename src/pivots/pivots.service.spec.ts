import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PivotsService } from './pivots.service';
import { PrismaService } from '@/prisma/prisma.service';
import { MqttService } from '@/mqtt/mqtt.service';
import { ConfigService } from '@/config/config.service';
import { PivotAction } from './dto/pivot-command.dto';

describe('PivotsService', () => {
  let service: PivotsService;
  let prisma: {
    farm: {
      findUnique: jest.Mock;
    };
    pivot: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let mqttService: jest.Mocked<MqttService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    prisma = {
      farm: {
        findUnique: (jest.Mock = jest.fn()),
      },
      pivot: {
        create: (jest.Mock = jest.fn()),
        findMany: (jest.Mock = jest.fn()),
        findUnique: (jest.Mock = jest.fn()),
        update: (jest.Mock = jest.fn()),
        delete: (jest.Mock = jest.fn()),
      },
    } as any;

    const mockMqttService = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const mockConfigService = {
      getMqttTopicPrefix: jest.fn().mockReturnValue('soiltech/pivots'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PivotsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MqttService, useValue: mockMqttService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PivotsService>(PivotsService);
    mqttService = module.get(MqttService);
    configService = module.get(ConfigService);
  });

  describe('create', () => {
    const farmId = '550e8400-e29b-41d4-a716-446655440000';
    const dto = {
      name: 'Pivot 1',
      latitude: -15.5,
      longitude: -47.8,
      bladeAt100: 25.5,
    };

    it('should create a pivot when farm exists', async () => {
      prisma.farm.findUnique.mockResolvedValue({ id: farmId });
      prisma.pivot.create.mockResolvedValue({
        id: 'pivot-id',
        ...dto,
        farmId,
        status: {},
      });

      const result = await service.create(farmId, dto);

      expect(result).toBeDefined();
      expect(result.name).toBe(dto.name);
      expect(prisma.farm.findUnique).toHaveBeenCalledWith({
        where: { id: farmId },
      });
      expect(prisma.pivot.create).toHaveBeenCalledWith({
        data: { ...dto, farmId, status: {} },
      });
    });

    it('should throw NotFoundException when farm does not exist', async () => {
      prisma.farm.findUnique.mockResolvedValue(null);

      await expect(service.create(farmId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle coordinates at boundary values', async () => {
      const edgeDto = { ...dto, latitude: 90, longitude: 180 };
      prisma.farm.findUnique.mockResolvedValue({ id: farmId });
      prisma.pivot.create.mockResolvedValue({
        id: 'pivot-id',
        ...edgeDto,
        farmId,
        status: {},
      });

      const result = await service.create(farmId, edgeDto);

      expect(result.latitude).toBe(90);
      expect(result.longitude).toBe(180);
    });
  });

  describe('findAllByFarm', () => {
    const farmId = '550e8400-e29b-41d4-a716-446655440000';

    it('should return pivots for a valid farm', async () => {
      prisma.farm.findUnique.mockResolvedValue({ id: farmId });
      const pivots = [
        { id: '1', name: 'P1' },
        { id: '2', name: 'P2' },
      ];
      prisma.pivot.findMany.mockResolvedValue(pivots);

      const result = await service.findAllByFarm(farmId);

      expect(result).toEqual(pivots);
      expect(prisma.pivot.findMany).toHaveBeenCalledWith({ where: { farmId } });
    });

    it('should throw NotFoundException when farm does not exist', async () => {
      prisma.farm.findUnique.mockResolvedValue(null);

      await expect(service.findAllByFarm(farmId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne', () => {
    const pivotId = 'pivot-uuid';

    it('should return pivot when found', async () => {
      const pivot = { id: pivotId, name: 'P1' };
      prisma.pivot.findUnique.mockResolvedValue(pivot);

      const result = await service.findOne(pivotId);

      expect(result).toEqual(pivot);
      expect(prisma.pivot.findUnique).toHaveBeenCalledWith({
        where: { id: pivotId },
      });
    });

    it('should throw NotFoundException when pivot not found', async () => {
      prisma.pivot.findUnique.mockResolvedValue(null);

      await expect(service.findOne(pivotId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const pivotId = 'pivot-uuid';
    const dto = { name: 'Updated Pivot' };

    it('should update pivot when found', async () => {
      prisma.pivot.findUnique.mockResolvedValue({ id: pivotId });
      prisma.pivot.update.mockResolvedValue({ id: pivotId, ...dto });

      const result = await service.update(pivotId, dto);

      expect(result.name).toBe(dto.name);
      expect(prisma.pivot.update).toHaveBeenCalledWith({
        where: { id: pivotId },
        data: dto,
      });
    });

    it('should throw NotFoundException when pivot not found', async () => {
      prisma.pivot.findUnique.mockResolvedValue(null);

      await expect(service.update(pivotId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    const pivotId = 'pivot-uuid';

    it('should delete pivot when found', async () => {
      prisma.pivot.findUnique.mockResolvedValue({ id: pivotId });
      prisma.pivot.delete.mockResolvedValue({ id: pivotId });

      const result = await service.remove(pivotId);

      expect(result).toBeDefined();
      expect(prisma.pivot.delete).toHaveBeenCalledWith({
        where: { id: pivotId },
      });
    });

    it('should throw NotFoundException when pivot not found', async () => {
      prisma.pivot.findUnique.mockResolvedValue(null);

      await expect(service.remove(pivotId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('sendCommand', () => {
    const pivotId = 'pivot-uuid';
    const command = { action: PivotAction.TURN_ON, withWater: true, percentimeter: 50 };

    it('should publish command to MQTT when pivot exists', async () => {
      prisma.pivot.findUnique.mockResolvedValue({ id: pivotId });

      await service.sendCommand(pivotId, command);

      expect(prisma.pivot.findUnique).toHaveBeenCalledWith({
        where: { id: pivotId },
      });
      expect(mqttService.publish).toHaveBeenCalledWith(
        `soiltech/pivots/${pivotId}/command`,
        command,
      );
    });

    it('should throw NotFoundException when pivot does not exist', async () => {
      prisma.pivot.findUnique.mockResolvedValue(null);

      await expect(service.sendCommand(pivotId, command)).rejects.toThrow(
        NotFoundException,
      );
      expect(mqttService.publish).not.toHaveBeenCalled();
    });
  });
});
