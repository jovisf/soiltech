import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UnauthorizedException, ConflictException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createUser', () => {
    const createUserDto: CreateUserDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };
    const resultUser = {
      id: 'uuid-1',
      email: 'test@example.com',
      name: 'Test User',
    };

    it('should register a new user', async () => {
      mockAuthService.register.mockResolvedValue(resultUser);

      const result = await controller.createUser(createUserDto);

      expect(service.register).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(resultUser);
    });

    it('should throw ConflictException if email is duplicate', async () => {
      mockAuthService.register.mockRejectedValue(
        new ConflictException('User exists'),
      );

      await expect(controller.createUser(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };
    const user = {
      id: 'uuid-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'OPERATOR' as any,
    };
    const loginResponse = { access_token: 'mock-jwt-token' };

    it('should return a JWT token', async () => {
      mockAuthService.login.mockResolvedValue(loginResponse);

      const result = await controller.login(loginDto, { user });

      expect(service.login).toHaveBeenCalledWith(user);
      expect(result).toEqual(loginResponse);
    });
  });
});
