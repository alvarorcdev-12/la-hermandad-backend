import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PrismaService } from 'src/prisma.service';
import { OrdersPaginationDto } from './dto/orders-pagination.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prismaService: PrismaService) {}

  create(createOrderDto: CreateOrderDto, storeId: string) {
    return 'This action adds a new order';
  }

  async findAll(ordersPaginationDto: OrdersPaginationDto, storeId: string) {
    const { page = 1, limit = 10 } = ordersPaginationDto;

    const [count, orders] = await Promise.all([
      this.prismaService.order.count({ where: { storeId } }),
      this.prismaService.order.findMany({
        where: { storeId },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          orderItems: true,
          customer: true,
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
      results: orders,
    };
  }

  async findOne(id: string, storeId: string) {
    const order = await this.prismaService.order.findFirst({
      where: {
        id: id,
        storeId: storeId,
      },
      include: {
        orderItems: true,
        customer: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with id: ${id} not found`);
    }

    return order;
  }

  update(id: string, updateOrderDto: UpdateOrderDto, storeId: string) {
    return `This action updates a #${id} order`;
  }

  orderCancel(id: string, storeId: string) {
    return `This action cancels an order`;
  }

  orderClose(id: string, storeId: string) {
    return `This action closes an order`;
  }

  orderOpen(id: string, storeId: string) {
    return `This action opens an order`;
  }

  remove(id: string, storeId: string) {
    return `This action removes a #${id} order`;
  }
}
