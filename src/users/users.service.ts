import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service.js';

import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';

import { UserMapper } from './mappers/user.mapper.js';
import { DBExceptionHelper } from '../common/helpers/db-exception.helper.js';

import type {
  UserOrderByWithRelationInput,
  UserWhereInput,
} from '../generated/prisma/models.js';

@Injectable()
export class UsersService {
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
    });

    return UserMapper.toStaffUserEntity(user);
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
      results: UserMapper.toStaffUserEntityList(users),
    };
  }
  async findOne(id: string, storeId: string) {
    const user = await this.prismaService.user.findFirst({
      where: {
        id: id,
        storeId: storeId,
      },
    });

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    return UserMapper.toStaffUserEntity(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto, storeId: string) {
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
      });

      return UserMapper.toStaffUserEntity(updateUser);
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

      return UserMapper.toStaffUserEntity(updateUser);
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
      });

      return UserMapper.toStaffUserEntity(deleteUser);
    } catch (error) {
      DBExceptionHelper.handle(error);
    }
  }
}
