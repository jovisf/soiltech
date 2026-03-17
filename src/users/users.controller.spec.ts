import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from '@/auth/dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };
    const createdUser = { id: 'uuid-1', ...createUserDto };

    it('should create a new user', async () => {
      mockUsersService.create.mockResolvedValue(createdUser);

      const result = await controller.create(createUserDto);

      expect(service.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(createdUser);
    });

    it('should throw ConflictException if service throws it', async () => {
      mockUsersService.create.mockRejectedValue(
        new ConflictException('User already exists'),
      );

      await expect(controller.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    const users = [
      { id: 'uuid-1', email: 'test1@example.com', name: 'User 1' },
    ];

    it('should return an array of users', async () => {
      mockUsersService.findAll.mockResolvedValue(users);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(users);
    });
  });

  describe('findOne', () => {
    const userId = 'uuid-1';
    const user = { id: userId, email: 'test1@example.com', name: 'User 1' };

    it('should return a single user', async () => {
      mockUsersService.findOne.mockResolvedValue(user);

      const result = await controller.findOne(userId);

      expect(service.findOne).toHaveBeenCalledWith(userId);
      expect(result).toEqual(user);
    });

    it('should throw NotFoundException if service throws it', async () => {
      mockUsersService.findOne.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(controller.findOne(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const userId = 'uuid-1';
    const updateUserDto: UpdateUserDto = { name: 'Updated Name' };
    const updatedUser = {
      id: userId,
      email: 'test1@example.com',
      name: 'Updated Name',
    };

    it('should update a user', async () => {
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(userId, updateUserDto);

      expect(service.update).toHaveBeenCalledWith(userId, updateUserDto);
      expect(result).toEqual(updatedUser);
    });

    it('should throw NotFoundException if service throws it', async () => {
      mockUsersService.update.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(controller.update(userId, updateUserDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    const userId = 'uuid-1';
    const removedUser = {
      id: userId,
      email: 'test1@example.com',
      name: 'User 1',
    };

    it('should remove a user', async () => {
      mockUsersService.remove.mockResolvedValue(removedUser);

      const result = await controller.remove(userId);

      expect(service.remove).toHaveBeenCalledWith(userId);
      expect(result).toEqual(removedUser);
    });

    it('should throw NotFoundException if service throws it', async () => {
      mockUsersService.remove.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(controller.remove(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
