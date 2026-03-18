import { Test, TestingModule } from '@nestjs/testing';
import { CyclesService } from './cycles.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { createMockPrismaService, MockPrismaService } from '../../test/helpers/prisma-mock';

describe('CyclesService', () => {
  let service: CyclesService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CyclesService,
        {
          provide: PrismaService,
          useValue: createMockPrismaService(),
        },
      ],
    }).compile();

    service = module.get<CyclesService>(CyclesService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllByState', () => {
    const pivotId = 'pivot-id';
    const stateId = 'state-id';
    const mockPivot = { id: pivotId, name: 'Pivot 1' };
    const mockState = { id: stateId, pivotId, timestamp: new Date() };
    const mockCycles = [
      { id: 'cycle-1', stateId, timestamp: new Date('2024-03-18T10:05:00Z') },
      { id: 'cycle-2', stateId, timestamp: new Date('2024-03-18T10:00:00Z') },
    ];

    it('should return paginated cycles for a state (happy path)', async () => {
      prisma.pivot.findUnique.mockResolvedValue(mockPivot);
      prisma.state.findUnique.mockResolvedValue(mockState);
      prisma.cycle.count.mockResolvedValue(2);
      prisma.cycle.findMany.mockResolvedValue(mockCycles);

      const result = await service.findAllByState(pivotId, stateId, { page: 1, limit: 10 });

      expect(prisma.pivot.findUnique).toHaveBeenCalledWith({ where: { id: pivotId } });
      expect(prisma.state.findUnique).toHaveBeenCalledWith({ where: { id: stateId } });
      expect(prisma.cycle.count).toHaveBeenCalledWith({ where: { stateId } });
      expect(prisma.cycle.findMany).toHaveBeenCalledWith({
        where: { stateId },
        skip: 0,
        take: 10,
        orderBy: { timestamp: 'desc' },
      });
      expect(result).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        data: mockCycles,
      });
    });

    it('should throw NotFoundException if pivot does not exist (error path)', async () => {
      prisma.pivot.findUnique.mockResolvedValue(null);

      await expect(service.findAllByState(pivotId, stateId, {})).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if state does not exist (error path)', async () => {
      prisma.pivot.findUnique.mockResolvedValue(mockPivot);
      prisma.state.findUnique.mockResolvedValue(null);

      await expect(service.findAllByState(pivotId, stateId, {})).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if state does not belong to the pivot (edge case)', async () => {
      prisma.pivot.findUnique.mockResolvedValue(mockPivot);
      prisma.state.findUnique.mockResolvedValue({ ...mockState, pivotId: 'wrong-pivot-id' });

      await expect(service.findAllByState(pivotId, stateId, {})).rejects.toThrow(NotFoundException);
    });

    it('should calculate skip correctly for subsequent pages', async () => {
      prisma.pivot.findUnique.mockResolvedValue(mockPivot);
      prisma.state.findUnique.mockResolvedValue(mockState);
      prisma.cycle.count.mockResolvedValue(25);
      prisma.cycle.findMany.mockResolvedValue([]);

      await service.findAllByState(pivotId, stateId, { page: 2, limit: 10 });

      expect(prisma.cycle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });
  });
});
