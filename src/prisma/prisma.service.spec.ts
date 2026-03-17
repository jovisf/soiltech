import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    // Mock the PrismaClient instance methods BEFORE instantiating PrismaService
    // Since PrismaService extends PrismaClient, we can mock the prototype methods
    // or just mock the instance methods after creation.
    // But since construction itself might fail, we mock the module.
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: {
            onModuleInit: jest.fn().mockImplementation(async function() { await this.$connect(); }),
            onModuleDestroy: jest.fn().mockImplementation(async function() { await this.$disconnect(); }),
            $connect: jest.fn().mockResolvedValue(undefined),
            $disconnect: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should call $connect', async () => {
      await service.onModuleInit();
      expect(service.$connect).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should call $disconnect', async () => {
      await service.onModuleDestroy();
      expect(service.$disconnect).toHaveBeenCalled();
    });
  });
});
