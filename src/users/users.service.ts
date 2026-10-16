import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service.js';
import { Prisma, type User } from '../generated/prisma/client.js';
import { PosPinService } from './pos-pin/pos-pin.service.js';
import {
  POS_PIN_PATTERN,
  POS_PIN_MESSAGE,
} from './pos-pin/pos-pin.validation.js';

import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';

import { UserMapper } from './mappers/user.mapper.js';
import { DBExceptionHelper } from '../common/helpers/db-exception.helper.js';

import type {
  UserOrderByWithRelationInput,
  UserWhereInput,
} from '../generated/prisma/models.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly posPinService: PosPinService,
  ) {}

  async getPosPin(id: string, storeId: string): Promise<{ pin: string }> {
    const user = await this.prismaService.user.findFirst({
      where: { id, storeId },
      select: { posPinEncrypted: true },
    });

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }
    if (user.posPinEncrypted === null) {
      throw new BadRequestException('El usuario no tiene un PIN POS asignado.');
    }

    return { pin: this.posPinService.decrypt(user.posPinEncrypted, storeId) };
  }

  async generatePin(storeId: string) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const pin = this.posPinService.generate();
      if (!POS_PIN_PATTERN.test(pin)) continue;
      const assigned = await this.prismaService.user.findUnique({
        where: {
          storeId_posPinLookup: {
            storeId,
            posPinLookup: this.posPinService.lookup(pin, storeId),
          },
        },
        select: { id: true },
      });
      if (!assigned) return { pin };
    }
    throw new ServiceUnavailableException(
      'No se pudo generar un PIN disponible. Intenta nuevamente.',
    );
  }

  async create(createUserDto: CreateUserDto, storeId: string) {
    const { firstName, lastName, email, phone, password, role, posPin } =
      createUserDto;
    if (
      role === 'CASHIER' &&
      (typeof posPin !== 'string' || !POS_PIN_PATTERN.test(posPin))
    ) {
      throw new BadRequestException(POS_PIN_MESSAGE);
    }
    const pinFields =
      role === 'CASHIER' && posPin !== undefined
        ? {
            posPinEncrypted: this.posPinService.encrypt(posPin, storeId),
            posPinLookup: this.posPinService.lookup(posPin, storeId),
          }
        : {};

    const existUser =
      email === null
        ? null
        : await this.prismaService.user.findFirst({
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

    try {
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
          ...pinFields,
        },
      });

      return UserMapper.toStaffUserEntity(user);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target: unknown = error.meta?.target;
        if (
          (Array.isArray(target) &&
            target.some(
              (field: unknown) =>
                field === 'pos_pin_lookup' || field === 'posPinLookup',
            )) ||
          target === 'users_store_id_pos_pin_lookup_key'
        ) {
          throw new ConflictException(
            'Este PIN ya está en uso. Genera uno nuevo.',
          );
        }
        throw new ConflictException(
          'Ya existe un usuario con esos datos únicos.',
        );
      }
      // Prisma errors can include write arguments; never log PIN storage fields.
      throw new InternalServerErrorException('No se pudo crear el usuario.');
    }
  }

  async findAll(paginationDto: PaginationDto, storeId: string) {
    const { page = 1, limit = 10, q, sort, direction } = paginationDto;

    const orderBy: UserOrderByWithRelationInput = {
      [sort ?? 'createdAt']: direction ?? 'asc',
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

  // Profile
  async getMyDataUser(user: User) {
    return await this.findOne(user.id, user.storeId);
  }

  async updateProfile(updateUserDto: UpdateUserDto, user: User) {
    const { firstName, lastName, email, phone } = updateUserDto;

    try {
      const updateProfile = await this.prismaService.user.update({
        where: {
          id: user.id,
        },
        data: {
          firstName,
          lastName,
          email,
          phone,
        },
      });

      return UserMapper.toEntity(updateProfile);
    } catch (error) {
      DBExceptionHelper.handle(error);
    }
  }

  async changePassword(changePasswordDto: ChangePasswordDto, user: User) {
    const currentUser = await this.prismaService.user.findFirstOrThrow({
      where: {
        id: user.id,
        storeId: user.storeId,
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

      return UserMapper.toStaffUserEntity(updateUser);
    } catch (error) {
      DBExceptionHelper.handle(error);
    }
  }
}
