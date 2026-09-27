import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PrismaService } from 'src/prisma.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

import { UserMapper } from 'src/users/mappers/user.mapper';

import type { JwtPayload } from './interfaces/jwt-payload.interface';
import type { UserGetPayload } from 'src/generated/prisma/models';

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
      throw new BadRequestException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password!);

    if (!isPasswordValid) {
      throw new BadRequestException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new BadRequestException('User is not active');
    }

    return {
      token: this.getJWTToken({ id: user.id }),
      user: UserMapper.toEntity(user),
    };
  }

  async register(registerUserDto: RegisterUserDto) {
    const prismaTx = await this.prismaService.$transaction(async (tx) => {
      // 1. Verificar si existe email
      const emailExist = await tx.user.findUnique({
        where: { email: registerUserDto.email },
        include: {
          store: true,
        },
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
        include: {
          store: true,
        },
      });

      return user;
    });

    return {
      token: this.getJWTToken({ id: prismaTx.id }),
      user: UserMapper.toEntity(prismaTx),
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
