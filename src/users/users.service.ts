import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service.js';

import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';

import { UserMapper } from './mappers/user.mapper.js';

import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

import type {
  UserOrderByWithRelationInput,
  UserWhereInput,
} from '../generated/prisma/models.js';
import type { User } from '../generated/prisma/client.js';
import { DBExceptionHelper } from '../common/helpers/db-exception.helper.js';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async create(createUserDto: CreateUserDto, storeId: string) {
    const { firstName, lastName, email, phone, password, role } = createUserDto;

    const existUser = await this.prismaService.user.findFirst({
      where: {
        email: email,
        storeId: storeId,
      },
    });

    if (existUser) {
      throw new BadRequestException(
        'Ya existe un usuario con el correo electrónico: ' + email,
      );
    }

    const user = await this.prismaService.user.create({
      data: {
        storeId: storeId,
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: phone,
        password: password ? bcrypt.hashSync(password, 10) : null,
        role: role,
        isShopOwner: false,
      },
      include: {
        store: true,
      },
    });

    return UserMapper.toEntity(user);
  }

  async findAll(paginationDto: PaginationDto, storeId: string) {
    const { page = 1, limit = 10, q, sort, direction } = paginationDto;

    const orderBy: UserOrderByWithRelationInput = {
      [sort ?? 'createdAt']: direction ?? 'desc',
    };

    const where: UserWhereInput = {
      storeId: storeId,
    };

    if (q) {
      where.OR = [
        {
          firstName: {
            contains: q,
            mode: 'insensitive',
          },
        },
        {
          lastName: {
            contains: q,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: q,
            mode: 'insensitive',
          },
        },
        {
          phone: {
            contains: q,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [count, users] = await Promise.all([
      this.prismaService.user.count({
        where,
      }),
      this.prismaService.user.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          store: true,
        },
      }),
    ]);

    const totalPages = Math.ceil(count / limit);

    return {
      meta: {
        totalItems: count,
        currentPage: page,
        pageSize: limit,
        totalPages: totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      results: UserMapper.toEntityList(users),
    };
  }

  async findOne(id: string, storeId: string) {
    const user = await this.prismaService.user.findFirst({
      where: {
        id: id,
        storeId: storeId,
      },
      include: {
        store: true,
      },
    });

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    return UserMapper.toEntity(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto, storeId: string) {
    await this.findOne(id, storeId);

    try {
      const updateUser = await this.prismaService.user.update({
        where: {
          id: id,
          storeId: storeId,
        },
        data: {
          firstName: updateUserDto.firstName,
          lastName: updateUserDto.lastName,
          email: updateUserDto.email,
          phone: updateUserDto.phone,
          role: updateUserDto.role,
        },
        include: {
          store: true,
        },
      });

      return UserMapper.toEntity(updateUser);
    } catch (error) {
      DBExceptionHelper.handle(error);
    }
  }

  async changeActiveStatus(id: string, storeId: string) {
    const user = await this.findOne(id, storeId);

    try {
      const updateUser = await this.prismaService.user.update({
        where: {
          id: id,
          storeId: storeId,
        },
        data: {
          isActive: !user.isActive,
        },
        include: {
          store: true,
        },
      });

      return UserMapper.toEntity(updateUser);
    } catch (error) {
      DBExceptionHelper.handle(error);
    }
  }

  async remove(id: string, storeId: string) {
    await this.findOne(id, storeId);

    try {
      const deleteUser = await this.prismaService.user.delete({
        where: {
          id: id,
          storeId: storeId,
        },
        include: {
          store: true,
        },
      });

      return UserMapper.toEntity(deleteUser);
    } catch (error) {
      DBExceptionHelper.handle(error);
    }
  }

  async getMyDataUser(user: User) {
    return await this.findOne(user.id, user.storeId);
  }

  async changePassword(changePasswordDto: ChangePasswordDto, user: User) {
    const currentUser = await this.prismaService.user.findFirstOrThrow({
      where: {
        id: user.id,
        storeId: user.storeId,
      },
      include: {
        store: true,
      },
    });

    const isMatchPassword = bcrypt.compareSync(
      changePasswordDto.currentPassword,
      currentUser.password!,
    );

    if (!isMatchPassword) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    if (changePasswordDto.newPassword === changePasswordDto.currentPassword) {
      throw new BadRequestException(
        'La nueva contraseña debe ser diferente de la contraseña actual',
      );
    }

    const hashPassword = bcrypt.hashSync(changePasswordDto.newPassword, 10);

    try {
      const updateUser = await this.prismaService.user.update({
        where: {
          id: user.id,
          storeId: user.storeId,
        },
        data: {
          password: hashPassword,
        },
        include: {
          store: true,
        },
      });

      return UserMapper.toEntity(updateUser);
    } catch (error) {
      DBExceptionHelper.handle(error);
    }
  }

  private handleDBExceptions(error: any): never {
    if (error instanceof HttpException) {
      throw error;
    }

    if (error instanceof PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002': {
          const target = error.meta?.target as string[] | undefined;
          const fields = target ? target.join(', ') : 'campo desconocido';

          throw new ConflictException(
            `Valor duplicado: Los campos [${fields}] deben ser únicos.`,
          );
        }

        case 'P2025': {
          throw new NotFoundException('No se encontró el registro requerido.');
        }

        case 'P2003': {
          const field = error.meta?.field_name as string | undefined;
          throw new BadRequestException(
            `No se puede realizar la operación: El campo referenciado ${field || 'desconocido'} no existe.`,
          );
        }
      }
    }

    this.logger.error('Unexpected error in OrdersService', error.stack);

    throw new InternalServerErrorException(
      'Error interno del servidor. Intente nuevamente más tarde.',
    );
  }
}
