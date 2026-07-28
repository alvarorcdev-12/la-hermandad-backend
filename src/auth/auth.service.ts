import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PrismaService } from 'src/prisma.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { User } from 'src/generated/prisma/client';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

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
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password!);

    if (!isPasswordValid) {
      throw new BadRequestException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new BadRequestException('User is not active');
    }

    const { password: _, createdAt, updatedAt, ...rest } = user;

    return { token: this.getJWTToken({ id: user.id }), user: rest };
  }

  async register(registerUserDto: RegisterUserDto) {
    const prismaTx = await this.prismaService.$transaction(async (tx) => {
      // 1. Verificar si existe email
      const emailExist = await tx.user.findUnique({
        where: { email: registerUserDto.email },
      });

      if (emailExist) {
        throw new BadRequestException('Email already exists');
      }

      // 2. Crear Tienda
      const store = await tx.store.create({
        data: {
          name: registerUserDto.storeName,
        },
      });

      // 3. Store Setting
      await tx.storeSetting.create({
        data: {
          storeId: store.id,
        },
      });

      // 4. Crear local
      await tx.location.create({
        data: {
          storeId: store.id,
          name: 'Store Location',
          isDefault: true,
        },
      });

      // 5. Crear owner de la store

      const user = await tx.user.create({
        data: {
          storeId: store.id,
          firstName: registerUserDto.firstName,
          lastName: registerUserDto.lastName,
          email: registerUserDto.email,
          password: bcrypt.hashSync(registerUserDto.password, 10),
          role: 'OWNER',
          isShopOwner: true,
        },
      });

      return user;
    });

    const { password: _, createdAt, updatedAt, ...rest } = prismaTx;

    return { token: this.getJWTToken({ id: prismaTx.id }), user: rest };
  }

  checkAuthStatus(user: User) {
    return {
      token: this.getJWTToken({ id: user.id }),
      user,
    };
  }

  private getJWTToken(payload: JwtPayload) {
    return this.jwtService.sign(payload);
  }
}
