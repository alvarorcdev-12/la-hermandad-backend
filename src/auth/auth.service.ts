import { UserMapper } from '../users/mappers/user.mapper.js';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '../prisma.service.js';
import { LoginUserDto } from './dto/login-user.dto.js';

import type { User } from '../generated/prisma/client.js';
import type { JwtPayload } from './interfaces/jwt-payload.interface.js';

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
      throw new UnauthorizedException('Credenciales inválidas (email).');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password!);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas (password).');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    return {
      token: this.getJWTToken({ id: user.id }),
      // TODO: mapper a la nueva entidad
      user: UserMapper.withoutPosPin(user),
      // user: UserMapper.toEntity(user),
    };
  }

  checkAuthStatus(user: User) {
    return {
      token: this.getJWTToken({ id: user.id }),
      user: UserMapper.withoutPosPin(user),
    };
  }

  private getJWTToken(payload: JwtPayload) {
    return this.jwtService.sign(payload);
  }
}
