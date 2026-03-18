import { Test, TestingModule } from '@nestjs/testing';
import { StatesService } from './states.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { createMockPrismaService, MockPrismaService } from '../../test/helpers/prisma-mock';

describe('StatesService', () => {
  let service: StatesService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatesService,
        {
          provide: PrismaService,
          useValue: createMockPrismaService(),
        },
      ],
    }).compile();

    service = module.get<StatesService>(StatesService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllByPivot', () => {
    const pivotId = 'pivot-id';
    const mockPivot = { id: pivotId, name: 'Pivot 1' };
    const mockStates = [
      { id: 'state-1', pivotId, timestamp: new Date('2024-03-18T10:00:00Z') },
      { id: 'state-2', pivotId, timestamp: new Date('2024-03-18T09:00:00Z') },
    ];

    it('should return paginated states for a pivot (happy path)', async () => {
      prisma.pivot.findUnique.mockResolvedValue(mockPivot);
      prisma.state.count.mockResolvedValue(2);
      prisma.state.findMany.mockResolvedValue(mockStates);

      const result = await service.findAllByPivot(pivotId, { page: 1, limit: 10 });

      expect(prisma.pivot.findUnique).toHaveBeenCalledWith({ where: { id: pivotId } });
      expect(prisma.state.count).toHaveBeenCalledWith({ where: { pivotId } });
      expect(prisma.state.findMany).toHaveBeenCalledWith({
        where: { pivotId },
        skip: 0,
        take: 10,
        orderBy: { timestamp: 'desc' },
      });
      expect(result).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        data: mockStates,
      });
    });

    it('should use default pagination values if not provided', async () => {
      prisma.pivot.findUnique.mockResolvedValue(mockPivot);
      prisma.state.count.mockResolvedValue(0);
      prisma.state.findMany.mockResolvedValue([]);

      await service.findAllByPivot(pivotId, {});

      expect(prisma.state.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should calculate skip correctly for subsequent pages', async () => {
      prisma.pivot.findUnique.mockResolvedValue(mockPivot);
      prisma.state.count.mockResolvedValue(25);
      prisma.state.findMany.mockResolvedValue([]);

      await service.findAllByPivot(pivotId, { page: 2, limit: 10 });

      expect(prisma.state.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });

    it('should throw NotFoundException if pivot does not exist (error path)', async () => {
      prisma.pivot.findUnique.mockResolvedValue(null);

      await expect(service.findAllByPivot(pivotId, {})).rejects.toThrow(NotFoundException);
    });

    it('should return empty data array if page is beyond total (edge case)', async () => {
      prisma.pivot.findUnique.mockResolvedValue(mockPivot);
      prisma.state.count.mockResolvedValue(5);
      prisma.state.findMany.mockResolvedValue([]);

      const result = await service.findAllByPivot(pivotId, { page: 10, limit: 10 });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(5);
    });
  });
});
