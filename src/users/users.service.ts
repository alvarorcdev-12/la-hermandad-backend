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
import { PrismaService } from 'src/prisma.service';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

import type {
  UserOrderByWithRelationInput,
  UserWhereInput,
} from 'src/generated/prisma/models';
import { UsersMapper } from './mapper/users.mapper';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

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
      throw new BadRequestException('User already exists with email: ' + email);
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

    return user;
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
      results: UsersMapper.toUserResponseDtoList(users),
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
      throw new BadRequestException('User not found');
    }

    return UsersMapper.toUserResponseDto(user);
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
      });

      return UsersMapper.toUserResponseDto(updateUser);
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }

  private handleDBExceptions(error: any): never {
    if (error instanceof HttpException) {
      throw error;
    }

    if (error instanceof PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002': {
          const target = error.meta?.target as string[] | undefined;
          const fields = target ? target.join(', ') : 'unknown field';

          throw new ConflictException(
            `Duplicate value: The field(s) [${fields}] must be unique.`,
          );
        }

        case 'P2025': {
          const cause = error.meta?.cause as string | undefined;
          throw new NotFoundException(
            cause || 'A required record was not found.',
          );
        }

        case 'P2003': {
          const field = error.meta?.field_name as string | undefined;
          throw new BadRequestException(
            `Cannot perform operation: The referenced ${field || 'field'} does not exist.`,
          );
        }
      }
    }

    this.logger.error('Unexpected error in OrdersService', error.stack);

    throw new InternalServerErrorException(
      'Internal server error. Please try again later.',
    );
  }
}
