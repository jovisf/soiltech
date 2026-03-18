import { Test, TestingModule } from '@nestjs/testing';
import { FarmsService } from './farms.service';
import { PrismaService } from '@/prisma/prisma.service';
import { createMockPrismaService, MockPrismaService } from 'test/helpers/prisma-mock';
import { NotFoundException } from '@nestjs/common';
import { CreateFarmDto } from './dto/create-farm.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';

describe('FarmsService', () => {
  let service: FarmsService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FarmsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<FarmsService>(FarmsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a farm', async () => {
      const dto: CreateFarmDto = {
        name: 'Test Farm',
        latitude: -15.123,
        longitude: -47.456,
      };
      const expectedFarm = { id: 'uuid', ...dto };
      prisma.farm.create.mockResolvedValue(expectedFarm);

      const result = await service.create(dto);

      expect(result).toEqual(expectedFarm);
      expect(prisma.farm.create).toHaveBeenCalledWith({ data: dto });
    });
  });

  describe('findAll', () => {
    it('should return all farms', async () => {
      const farms = [{ id: '1', name: 'Farm 1' }, { id: '2', name: 'Farm 2' }];
      prisma.farm.findMany.mockResolvedValue(farms);

      const result = await service.findAll();

      expect(result).toEqual(farms);
      expect(prisma.farm.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a farm if found', async () => {
      const farm = { id: 'uuid', name: 'Test Farm' };
      prisma.farm.findUnique.mockResolvedValue(farm);

      const result = await service.findOne('uuid');

      expect(result).toEqual(farm);
      expect(prisma.farm.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid' },
        include: { pivots: true },
      });
    });

    it('should throw NotFoundException if farm not found', async () => {
      prisma.farm.findUnique.mockResolvedValue(null);

      await expect(service.findOne('uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a farm', async () => {
      const farm = { id: 'uuid', name: 'Old Name' };
      const dto: UpdateFarmDto = { name: 'New Name' };
      const updatedFarm = { ...farm, ...dto };

      prisma.farm.findUnique.mockResolvedValue(farm);
      prisma.farm.update.mockResolvedValue(updatedFarm);

      const result = await service.update('uuid', dto);

      expect(result).toEqual(updatedFarm);
      expect(prisma.farm.update).toHaveBeenCalledWith({
        where: { id: 'uuid' },
        data: dto,
      });
    });

    it('should throw NotFoundException if farm to update does not exist', async () => {
      prisma.farm.findUnique.mockResolvedValue(null);

      await expect(service.update('uuid', { name: 'New' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a farm', async () => {
      const farm = { id: 'uuid', name: 'Test Farm' };
      prisma.farm.findUnique.mockResolvedValue(farm);
      prisma.farm.delete.mockResolvedValue(farm);

      const result = await service.remove('uuid');

      expect(result).toEqual(farm);
      expect(prisma.farm.delete).toHaveBeenCalledWith({
        where: { id: 'uuid' },
      });
    });

    it('should throw NotFoundException if farm to delete does not exist', async () => {
      prisma.farm.findUnique.mockResolvedValue(null);

      await expect(service.remove('uuid')).rejects.toThrow(NotFoundException);
    });
  });
});
