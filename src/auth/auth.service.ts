import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';
import { RegisterUserDto } from './dto/register-user.dto.js';
import { LoginUserDto } from './dto/login-user.dto.js';

import { UserMapper } from '../users/mappers/user.mapper.js';

import type { JwtPayload } from './interfaces/jwt-payload.interface.js';
import type { UserGetPayload } from '../generated/prisma/models.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;

    const user = await this.prismaService.user.findUnique({
      where: { email: email },
      include: {
        store: true,
      },
    });

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password!);

    if (!isPasswordValid) {
      throw new BadRequestException('Credenciales inválidas');
    }

    if (!user.isActive) {
      throw new BadRequestException('El usuario está inactivo');
    }

    return {
      token: this.getJWTToken({ id: user.id }),
      user: UserMapper.toEntity(user),
    };
  }

  async register(registerUserDto: RegisterUserDto) {
    const emailExist = await this.prismaService.user.findUnique({
      where: { email: registerUserDto.email },
      select: { id: true },
    });

    if (emailExist) {
      throw new BadRequestException('El correo electrónico ya existe');
    }

    const password = await bcrypt.hash(registerUserDto.password, 10);
    let user: UserGetPayload<{ include: { store: true } }>;

    try {
      // Nested writes create all registration records atomically.
      user = await this.prismaService.user.create({
        data: {
          firstName: registerUserDto.firstName,
          lastName: registerUserDto.lastName,
          email: registerUserDto.email,
          password,
          role: 'OWNER',
          isShopOwner: true,
          store: {
            create: {
              name: registerUserDto.storeName,
              settings: { create: {} },
              locations: {
                create: { name: 'Store Location', isDefault: true },
              },
            },
          },
        },
        include: { store: true },
      });
    } catch (error) {
      // The unique constraint also handles simultaneous registrations.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('El correo electrónico ya existe');
      }
      throw error;
    }

    return {
      token: this.getJWTToken({ id: user.id }),
      user: UserMapper.toEntity(user),
    };
  }

  checkAuthStatus(user: UserGetPayload<{ include: { store: true } }>) {
    return {
      token: this.getJWTToken({ id: user.id }),
      user: UserMapper.toEntity(user),
    };
  }

  private getJWTToken(payload: JwtPayload) {
    return this.jwtService.sign(payload);
  }
}
