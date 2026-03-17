import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  MockPrismaService,
  createMockPrismaService,
} from 'test/helpers/prisma-mock';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';

// Mock the bcrypt functions
jest.mock('bcrypt', () => ({
  ...jest.requireActual('bcrypt'),
  hash: jest.fn((password) => Promise.resolve(`hashed_${password}`)),
  compare: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: MockPrismaService;

  beforeEach(async () => {
    prismaService = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };
    const createdUser = {
      id: 'user-id-1',
      ...createUserDto,
      password: 'hashed_password123',
    };

    // Happy path
    it('should create a new user and hash the password', async () => {
      prismaService.user.create.mockResolvedValue(createdUser);

      const result = await service.create(createUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: { ...createUserDto, password: 'hashed_password123' },
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...expectedUser } = createdUser;
      expect(result).toEqual(expectedUser);
    });

    // Error path: Duplicate email
    it('should throw ConflictException if email already exists (Prisma P2002)', async () => {
      prismaService.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '2.x',
          meta: { target: ['email'] },
        }),
      );

      await expect(service.create(createUserDto)).rejects.toThrow(
        new ConflictException('User with this email already exists'),
      );
    });
  });

  describe('findAll', () => {
    const users = [
      {
        id: 'user-id-1',
        email: 'test1@example.com',
        name: 'User 1',
        password: 'hashed1',
      },
      {
        id: 'user-id-2',
        email: 'test2@example.com',
        name: 'User 2',
        password: 'hashed2',
      },
    ];

    // Happy path
    it('should return an array of users', async () => {
      prismaService.user.findMany.mockResolvedValue(users);

      const result = await service.findAll();

      expect(prismaService.user.findMany).toHaveBeenCalledTimes(1);
      const expectedUsers = users.map(({ password, ...rest }) => rest);
      expect(result).toEqual(expectedUsers);
    });

    // Edge case: Return empty array
    it('should return an empty array if no users exist', async () => {
      prismaService.user.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(prismaService.user.findMany).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    const userId = 'user-id-1';
    const user = {
      id: userId,
      email: 'test1@example.com',
      name: 'User 1',
      password: 'hashed1',
    };

    // Happy path
    it('should return a user by ID', async () => {
      prismaService.user.findUnique.mockResolvedValue(user);

      const result = await service.findOne(userId);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...expectedUser } = user;
      expect(result).toEqual(expectedUser);
    });

    // Error path: User not found
    it('should throw NotFoundException if user is not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne(userId)).rejects.toThrow(
        new NotFoundException(`User with ID "${userId}" not found`),
      );
    });
  });

  describe('update', () => {
    const userId = 'user-id-1';
    const updateUserDto: UpdateUserDto = { name: 'Updated Name' };
    const updatedUser = {
      id: userId,
      email: 'test1@example.com',
      name: 'Updated Name',
      password: 'hashed1',
    };

    // Happy path: Update name
    it('should update an existing user', async () => {
      prismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(userId, updateUserDto);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateUserDto,
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...expectedUser } = updatedUser;
      expect(result).toEqual(expectedUser);
    });

    // Happy path: Update password
    it('should hash and update password if provided', async () => {
      const passwordUpdateDto: UpdateUserDto = { password: 'newPassword123' };
      const updatedUserWithNewPassword = {
        id: userId,
        email: 'test1@example.com',
        name: 'User 1',
        password: 'hashed_newPassword123',
      };
      prismaService.user.update.mockResolvedValue(updatedUserWithNewPassword);

      const result = await service.update(userId, passwordUpdateDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { password: 'hashed_newPassword123' },
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...expectedUser } = updatedUserWithNewPassword;
      expect(result).toEqual(expectedUser);
    });

    // Error path: User not found
    it('should throw NotFoundException if user to update is not found (Prisma P2025)', async () => {
      prismaService.user.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '2.x',
        }),
      );

      await expect(service.update(userId, updateUserDto)).rejects.toThrow(
        new NotFoundException(`User with ID "${userId}" not found`),
      );
    });

    // Error path: Duplicate email on update
    it('should throw ConflictException if email already exists on update (Prisma P2002)', async () => {
      const emailUpdateDto: UpdateUserDto = { email: 'existing@example.com' };
      prismaService.user.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '2.x',
          meta: { target: ['email'] },
        }),
      );

      await expect(service.update(userId, emailUpdateDto)).rejects.toThrow(
        new ConflictException('User with this email already exists'),
      );
    });
  });

  describe('remove', () => {
    const userId = 'user-id-1';
    const removedUser = {
      id: userId,
      email: 'test1@example.com',
      name: 'User 1',
      password: 'hashed1',
    };

    // Happy path
    it('should remove a user by ID', async () => {
      prismaService.user.delete.mockResolvedValue(removedUser);

      const result = await service.remove(userId);

      expect(prismaService.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...expectedUser } = removedUser;
      expect(result).toEqual(expectedUser);
    });

    // Error path: User not found
    it('should throw NotFoundException if user to remove is not found (Prisma P2025)', async () => {
      prismaService.user.delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '2.x',
        }),
      );

      await expect(service.remove(userId)).rejects.toThrow(
        new NotFoundException(`User with ID "${userId}" not found`),
      );
    });
  });
});
