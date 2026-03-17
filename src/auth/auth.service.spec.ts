import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { MockPrismaService, createMockPrismaService } from 'test/helpers/prisma-mock';
import * as bcrypt from 'bcrypt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '@/users/users.service';

// Mock the bcrypt.compare function
jest.mock('bcrypt', () => ({
  ...jest.requireActual('bcrypt'),
  compare: jest.fn(),
  hash: jest.fn(() => 'hashedPassword'),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: MockPrismaService;
  let jwtService: JwtService;
  let usersService: UsersService;

  beforeEach(async () => {
    prismaService = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        UsersService, // UsersService is a dependency of AuthService
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(() => 'mockAccessToken'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    usersService = module.get<UsersService>(UsersService);

    // Mock UsersService methods as they are used by AuthService
    jest.spyOn(usersService, 'create').mockImplementation(async (dto: CreateUserDto) => {
      if (dto.email === 'existing@example.com') {
        throw new ConflictException('User with this email already exists');
      }
      return { id: 'some-uuid', ...dto, password: 'hashedPassword' } as any; // reason: simplified user object for mock
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    // Happy path
    it('should successfully register a new user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const result = await service.register(createUserDto);

      expect(usersService.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(expect.objectContaining({ email: 'test@example.com' }));
      expect(result).not.toHaveProperty('password');
    });

    // Error path: Duplicate email
    it('should throw ConflictException if email already exists', async () => {
      const createUserDto: CreateUserDto = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Existing User',
      };

      await expect(service.register(createUserDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('validateUser', () => {
    const user = { id: 'user-id', email: 'test@example.com', password: 'hashedPassword', name: 'Test User' };

    // Happy path
    it('should return the user if credentials are valid', async () => {
      prismaService.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
      expect(result).toEqual(expect.objectContaining({ email: 'test@example.com' }));
      expect(result).not.toHaveProperty('password');
    });

    // Error path: Invalid password
    it('should return null if password is invalid', async () => {
      prismaService.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashedPassword');
      expect(result).toBeNull();
    });

    // Error path: User not found
    it('should return null if user is not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'password123');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({ where: { email: 'nonexistent@example.com' } });
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = { email: 'test@example.com', password: 'password123' };
    const user = { id: 'user-id', email: 'test@example.com', password: 'hashedPassword', name: 'Test User' };

    // Happy path
    it('should return an access token on successful login', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(user);
      (jwtService.sign as jest.Mock).mockReturnValue('mockAccessToken');

      const result = await service.login(loginDto);

      expect(service.validateUser).toHaveBeenCalledWith(loginDto.email, loginDto.password);
      expect(jwtService.sign).toHaveBeenCalledWith({ email: user.email, sub: user.id });
      expect(result).toEqual({ access_token: 'mockAccessToken' });
    });

    // Error path: Invalid credentials (user not found or wrong password)
    it('should throw UnauthorizedException for invalid credentials', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(service.validateUser).toHaveBeenCalledWith(loginDto.email, loginDto.password);
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });
});
