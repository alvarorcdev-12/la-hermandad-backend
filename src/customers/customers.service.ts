import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PrismaService } from 'src/prisma.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CustomerWhereInput } from 'src/generated/prisma/models';
import { CustomersMapper } from './mappers/customers.mapper';

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
      this.handleDBExceptions(error);
    }
  }

  async findAll(paginationDto: PaginationDto, storeId: string) {
    const { page = 1, limit = 10, q, sort, direction } = paginationDto;

    const orderBy = {
      [sort ?? 'createdAt']: direction ?? 'desc',
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
            orderBy: {
              createdAt: 'desc',
            },
            select: {
              id: true,
              totalPrice: true,
              orderName: true,
              createdAt: true,
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
      results: CustomersMapper.toCustomerResponseDtoList(customers),
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
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            totalPrice: true,
            orderName: true,
            createdAt: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with id ${id} not found`);
    }

    return CustomersMapper.toCustomerResponseDto(customer);
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
      this.handleDBExceptions(error);
    }
  }

  async remove(id: string, storeId: string) {
    const customer = await this.findOne(id, storeId);

    if (!customer.canDelete) {
      throw new ForbiddenException('Customer cannot be deleted');
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
      this.handleDBExceptions(error);
    }
  }

  private handleDBExceptions(error: any) {
    console.log({ error });
    if (error.code === 'P2002') {
      throw new ConflictException('Duplicate value');
    }

    throw new InternalServerErrorException('Internal server error');
  }
}
