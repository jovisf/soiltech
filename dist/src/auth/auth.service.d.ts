import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from '@/users/users.service';
export declare class AuthService {
    private prisma;
    private jwtService;
    private usersService;
    constructor(prisma: PrismaService, jwtService: JwtService, usersService: UsersService);
    register(createUserDto: CreateUserDto): Promise<{
        email: string;
        name: string;
        id: string;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
        updatedAt: Date;
    }>;
    validateUser(email: string, pass: string): Promise<any>;
    login(loginDto: LoginDto): Promise<{
        access_token: string;
    }>;
}
