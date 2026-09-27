import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';

import { PrismaService } from '../prisma.service.js';
import { DBExceptionHelper } from '../common/helpers/db-exception.helper.js';

import type { CustomerWhereInput } from '../generated/prisma/models.js';
import { CustomerMapper } from './mappers/customer.mapper.js';

@Injectable()
export class CustomersService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createCustomerDto: CreateCustomerDto, storeId: string) {
    try {
      const customer = await this.prismaService.customer.create({
        data: {
          ...createCustomerDto,
          storeId: storeId,
        },
      });

      return customer;
    } catch (error) {
      DBExceptionHelper.handle(error);
    }
  }

  async findAll(paginationDto: PaginationDto, storeId: string) {
    const {
      page = 1,
      limit = 10,
      sort = 'createdAt',
      direction,
      q,
    } = paginationDto;

    const orderBy = {
      [sort]: direction || 'desc',
    };

    const where: CustomerWhereInput = {
      storeId: storeId,
    };

    if (q) {
      where.OR = [
        {
          firstName: { contains: q, mode: 'insensitive' },
        },
        {
          lastName: { contains: q, mode: 'insensitive' },
        },
        {
          phone: { contains: q, mode: 'insensitive' },
        },
        {
          email: { contains: q, mode: 'insensitive' },
        },
      ];
    }

    const [customers, count] = await Promise.all([
      this.prismaService.customer.findMany({
        where: where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { orders: true },
          },
          orders: {
            select: {
              totalPrice: true,
            },
          },
        },
      }),
      this.prismaService.customer.count({
        where: where,
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
      results: CustomerMapper.toEntityList(customers),
    };
  }

  async findOne(id: string, storeId: string) {
    const customer = await this.prismaService.customer.findFirst({
      where: {
        id: id,
        storeId: storeId,
      },
      include: {
        _count: {
          select: { orders: true },
        },
        orders: {
          select: {
            totalPrice: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Cliente con id ${id} no encontrado`);
    }

    return CustomerMapper.toEntity(customer);
  }

  async update(
    id: string,
    storeId: string,
    updateCustomerDto: UpdateCustomerDto,
  ) {
    await this.findOne(id, storeId);

    try {
      const updatedCustomer = await this.prismaService.customer.update({
        where: {
          id: id,
          storeId: storeId,
        },
        data: updateCustomerDto,
      });

      return updatedCustomer;
    } catch (error) {
      DBExceptionHelper.handle(error);
    }
  }

  async remove(id: string, storeId: string) {
    const customer = await this.findOne(id, storeId);

    if (!customer.canDelete) {
      throw new ForbiddenException('Cliente no puede ser eliminado');
    }

    try {
      const deletedCustomer = await this.prismaService.customer.delete({
        where: {
          id: id,
          storeId: storeId,
        },
      });

      return deletedCustomer;
    } catch (error) {
      DBExceptionHelper.handle(error);
    }
  }
}
