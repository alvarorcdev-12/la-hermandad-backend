import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Decimal,
  PrismaClientKnownRequestError,
} from '@prisma/client/runtime/client';
import { PrismaService } from 'src/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderItemDto } from './dto/order-item.dto';
import { OrdersPaginationDto } from './dto/orders-pagination.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { AddItemsDto } from './dto/add-items.dto';
import { EditItemQuantityDto } from './dto/edit-item-quantity.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { OrdersMapper } from './mapper/orders.mapper';

import type { Product, User } from 'src/generated/prisma/client';
import {
  OrderOrderByWithRelationInput,
  OrderWhereInput,
} from 'src/generated/prisma/models';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async create(createOrderDto: CreateOrderDto, user: User) {
    const { customerId, email, phone, note, items } = createOrderDto;

    const storeId = user.storeId;

    const productIds = items.map((item) => item.productId);

    try {
      const prismaTx = await this.prismaService.$transaction(async (tx) => {
        // 1. Obtener prefijos para el orderName;
        const storeSetting = await tx.storeSetting.findFirstOrThrow({
          where: { storeId },
        });

        const { nextOrderNumber, orderPrefix, orderSuffix } = storeSetting;

        const orderName = `${orderPrefix}${nextOrderNumber}${orderSuffix}`;

        // 2. Obtener localidad por defecto
        const location = await tx.location.findFirstOrThrow({
          where: {
            storeId,
            isDefault: true,
            isActive: true,
          },
        });

        // 3. Obtener datos del cliente

        const customer = await tx.customer.findFirst({
          where: {
            id: customerId,
            storeId: storeId,
          },
        });

        // 4. Obtener productos
        const products = await tx.product.findMany({
          where: {
            id: {
              in: productIds,
            },
            storeId: storeId,
          },
        });

        // 5. armar items de la orden
        const orderItems = this.buildOrderItems(items, products);

        // 6. calcular subtotales
        const {
          subtotalPrice,
          totalPrice: totalPirce,
          itemCount,
        } = this.calculatedOrder(orderItems);

        // 7. Decrementar invetoryQuantity si product.trackInventory = true

        const trackedProducts = orderItems.filter(
          (item) => item.trackInventory,
        );

        if (trackedProducts.length > 0) {
          const updateProductStockPromises = trackedProducts.map((item) => {
            return tx.product.updateMany({
              where: {
                id: item.productId,
                storeId: storeId,
                inventoryQuantity: {
                  gte: item.quantity,
                },
              },
              data: {
                inventoryQuantity: {
                  decrement: item.quantity,
                },
              },
            });
          });

          const updateProductStock = await Promise.all(
            updateProductStockPromises,
          );

          updateProductStock.forEach((result, index) => {
            if (result.count === 0) {
              throw new BadRequestException(
                `Insufficient stock for product "${trackedProducts[index].productTitle}".`,
              );
            }
          });
        }

        //8. Crear la orden

        const order = await tx.order.create({
          data: {
            userId: user.id,
            storeId: storeId,
            locationId: location.id,
            customerId: customerId,
            orderName: orderName,
            orderNumber: nextOrderNumber,
            itemCount: itemCount,
            subtotalPrice: subtotalPrice,
            totalPrice: totalPirce,
            email: email ? email : customer?.email,
            phone: phone ? phone : customer?.phone,
            note: note,
            orderItems: {
              createMany: {
                data: orderItems.map(({ trackInventory, ...rest }) => rest),
              },
            },
          },
          include: {
            orderItems: {
              where: {
                quantity: { gt: 0 },
              },
            },
            customer: true,
            // user: true,
          },
        });
        // 9. Incrementar el numero de orden
        await tx.storeSetting.update({
          where: { storeId: storeId },
          data: { nextOrderNumber: { increment: 1 } },
        });

        return order;
      });

      return OrdersMapper.toOrderResponseDto(prismaTx);
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findAll(ordersPaginationDto: OrdersPaginationDto, storeId: string) {
    const {
      page = 1,
      limit = 10,
      status,
      sort,
      direction,
      q,
    } = ordersPaginationDto;

    const orderBy: OrderOrderByWithRelationInput = {
      [sort ?? 'createdAt']: direction ?? 'desc',
    };

    const where: OrderWhereInput = {
      storeId: storeId,
      status: status,
    };

    if (q) {
      where.OR = [
        {
          orderName: {
            contains: q,
            mode: 'insensitive',
          },
        },
        {
          customer: {
            firstName: {
              contains: q,
              mode: 'insensitive',
            },
          },
        },
        {
          customer: {
            lastName: {
              contains: q,
              mode: 'insensitive',
            },
          },
        },
        {
          customer: {
            email: {
              contains: q,
              mode: 'insensitive',
            },
          },
        },
        {
          customer: {
            phone: {
              contains: q,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    const [count, orders] = await Promise.all([
      this.prismaService.order.count({ where }),
      this.prismaService.order.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          orderItems: {
            where: {
              quantity: { gt: 0 },
            },
          },
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
      results: OrdersMapper.toOrderResponseDtoList(orders),
    };
  }

  async findOne(id: string, storeId: string) {
    const order = await this.prismaService.order.findFirst({
      where: {
        id: id,
        storeId: storeId,
      },
      include: {
        orderItems: {
          where: {
            quantity: { gt: 0 },
          },
        },
        customer: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with id: ${id} not found`);
    }

    return OrdersMapper.toOrderResponseDto(order);
  }

  async update(id: string, updateOrderDto: UpdateOrderDto, storeId: string) {
    await this.findOne(id, storeId);

    const { email, phone, note, customerId } = updateOrderDto;

    try {
      const updateOrder = await this.prismaService.order.update({
        where: {
          id: id,
          storeId: storeId,
        },
        data: {
          note: note,
          email: email,
          phone: phone,
          customerId: customerId,
        },
        include: {
          orderItems: {
            where: {
              quantity: { gt: 0 },
            },
          },
          customer: true,
        },
      });

      return OrdersMapper.toOrderResponseDto(updateOrder);
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  // Items
  async addItems(id: string, storeId: string, addItemsDto: AddItemsDto) {
    const order = await this.findOne(id, storeId);

    if (order.status !== 'OPEN') {
      throw new BadRequestException('The order must be open to add items');
    }

    const { productIds } = addItemsDto;

    const prismaTx = await this.prismaService.$transaction(async (tx) => {
      // 1.Obtener products DB
      const productsDB = await tx.product.findMany({
        where: {
          id: {
            in: productIds,
          },
          storeId: storeId,
        },
      });

      // 2. crear items
      const items = productIds.map((productId) => ({
        productId: productId,
        quantity: 1,
      }));

      const orderItems = this.buildOrderItems(items, productsDB);

      const updateOrderItems = await tx.order.update({
        where: { id: id, storeId: storeId },
        data: {
          orderItems: {
            createMany: {
              data: orderItems.map(({ trackInventory, ...rest }) => rest),
            },
          },
        },
        include: {
          orderItems: {
            where: {
              quantity: { gt: 0 },
            },
          },
        },
      });

      // 3 actualizar stock de los productos
      const trackedProducts = orderItems.filter((item) => item.trackInventory);

      if (trackedProducts.length > 0) {
        const updateProductStockPromises = trackedProducts.map((item) => {
          return tx.product.updateMany({
            where: {
              id: item.productId,
              storeId: storeId,
              inventoryQuantity: {
                gte: item.quantity,
              },
            },
            data: {
              inventoryQuantity: {
                decrement: item.quantity,
              },
            },
          });
        });

        const updateProductStock = await Promise.all(
          updateProductStockPromises,
        );

        updateProductStock.forEach((result, index) => {
          if (result.count === 0) {
            throw new BadRequestException(
              `Insufficient stock for product "${trackedProducts[index].productTitle}".`,
            );
          }
        });
      }

      // 4. calcular total del pedido
      const {
        itemCount,
        subtotalPrice,
        totalPrice: totalPirce,
      } = this.calculatedOrder(updateOrderItems.orderItems);

      // 5. actualizar el pedido con los nuevos totales y items
      const updateOrderWithItems = await tx.order.update({
        where: { id: id, storeId: storeId },
        data: {
          itemCount: itemCount,
          subtotalPrice: subtotalPrice,
          totalPrice: totalPirce,
        },
        include: {
          orderItems: {
            where: {
              quantity: { gt: 0 },
            },
          },
          customer: true,
        },
      });

      return updateOrderWithItems;
    });

    return OrdersMapper.toOrderResponseDto(prismaTx);
  }

  async editItemQuantity(
    id: string,
    itemId: string,
    editItemQuantityDto: EditItemQuantityDto,
    storeId: string,
  ) {
    const currentOrder = await this.findOne(id, storeId);

    if (currentOrder.status !== 'OPEN') {
      throw new BadRequestException(
        'The order must be open to edit item quantity.',
      );
    }

    const { quantity: newQuantity, restock } = editItemQuantityDto;

    return await this.prismaService.$transaction(async (tx) => {
      const currentItem = await tx.orderItem.findUniqueOrThrow({
        where: {
          id: itemId,
          orderId: id,
        },
        include: {
          product: true,
        },
      });

      const currentQuantity = currentItem.quantity;
      const delta = newQuantity - currentQuantity;

      if (delta === 0) {
        return currentOrder;
      }

      if (currentItem.product.trackInventory) {
        if (delta > 0) {
          const result = await tx.product.updateMany({
            where: {
              id: currentItem.productId,
              storeId: storeId,
              inventoryQuantity: { gte: delta },
            },
            data: {
              inventoryQuantity: { decrement: delta },
            },
          });

          if (result.count === 0) {
            throw new BadRequestException(
              `Insufficient stock for product "${currentItem.product.title}".`,
            );
          }
        } else if (delta < 0 && restock) {
          await tx.product.update({
            where: {
              id: currentItem.productId,
              storeId: storeId,
            },
            data: {
              inventoryQuantity: { increment: Math.abs(delta) },
            },
          });
        }
      }

      const newTotalPrice = currentItem.unitPrice.mul(newQuantity);
      await tx.orderItem.update({
        where: {
          id: itemId,
          orderId: id,
        },
        data: {
          quantity: newQuantity,
          totalPrice: newTotalPrice,
        },
      });

      const order = await tx.order.findFirstOrThrow({
        where: {
          id: id,
          storeId: storeId,
        },
        include: {
          orderItems: {
            where: {
              quantity: { gt: 0 },
            },
          },
        },
      });

      const { itemCount, subtotalPrice, totalPrice } = this.calculatedOrder(
        order.orderItems,
      );

      const updatedOrder = await tx.order.update({
        where: {
          id: id,
          storeId: storeId,
        },
        data: {
          itemCount: itemCount,
          subtotalPrice: subtotalPrice,
          totalPrice: totalPrice,
        },
        include: {
          orderItems: {
            where: {
              quantity: { gt: 0 },
            },
          },
          customer: true,
        },
      });

      return OrdersMapper.toOrderResponseDto(updatedOrder);
    });
  }

  async orderOpen(id: string, storeId: string) {
    const order = await this.findOne(id, storeId);

    if (order.status !== 'CLOSED') {
      throw new BadRequestException(
        'Only closed orders can be opened again. (un-close)',
      );
    }

    if (order.finalcialStatus === 'VOIDED') {
      throw new BadRequestException(
        'Voided orders cannot be opened again. Please, create a new order instead.',
      );
    }

    const openOrder = await this.prismaService.order.update({
      where: {
        id: id,
        storeId: storeId,
      },
      data: {
        status: 'OPEN',
        closedAt: null,
      },
      include: {
        orderItems: {
          where: {
            quantity: { gt: 0 },
          },
        },
        customer: true,
      },
    });

    return OrdersMapper.toOrderResponseDto(openOrder);
  }

  async orderCancel(
    id: string,
    storeId: string,
    cancelOrderDto: CancelOrderDto,
  ) {
    const { reason } = cancelOrderDto;
    const order = await this.findOne(id, storeId);

    if (order.status === 'CANCELLED') {
      return order;
    }

    if (order.status === 'CLOSED') {
      throw new BadRequestException('Cannot cancel a closed order.');
    }

    return this.prismaService.$transaction(async (tx) => {
      const orderItems = await tx.orderItem.findMany({
        where: {
          order: {
            id: id,
            storeId: storeId,
          },
        },
        include: {
          product: true,
        },
      });

      for (const item of orderItems) {
        if (item.product.trackInventory && item.quantity > 0) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              inventoryQuantity: { increment: item.quantity },
            },
          });
        }
      }

      const cancelledOrder = await tx.order.update({
        where: {
          id: id,
          storeId: storeId,
        },
        data: {
          status: 'CANCELLED',
          financialStatus: 'VOIDED',
          cancelReason: reason,
          cancelledAt: new Date(),
        },
        include: {
          orderItems: {
            where: {
              quantity: { gt: 0 },
            },
          },
          customer: true,
        },
      });

      return OrdersMapper.toOrderResponseDto(cancelledOrder);
    });
  }

  async orderClose(id: string, storeId: string) {
    const order = await this.findOne(id, storeId);

    if (order.status !== 'OPEN') {
      throw new BadRequestException('Cannot close an order that is not open.');
    }

    const invalidFinancialStatuses = ['PENDING', 'PARTIALLY_PAID'];
    if (invalidFinancialStatuses.includes(order.finalcialStatus)) {
      throw new BadRequestException(
        `Cannot close order. Financial status is ${order.finalcialStatus}. All transactions must be finalized (PAID, REFUNDED, etc.).`,
      );
    }
    try {
      const closeOrder = await this.prismaService.order.update({
        where: {
          id: id,
          storeId: storeId,
        },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
        },
        include: {
          orderItems: {
            where: {
              quantity: { gt: 0 },
            },
          },
          customer: true,
        },
      });

      return OrdersMapper.toOrderResponseDto(closeOrder);
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  private buildOrderItems(items: OrderItemDto[], productsDB: Product[]) {
    return items.map((item) => {
      const product = productsDB.find((p) => p.id === item.productId);
      if (!product) {
        throw new BadRequestException(
          `Product with id: ${item.productId} was not found.`,
        );
      }

      const unitPrice = new Decimal(product.price);
      const totalPrice = unitPrice.mul(item.quantity);

      return {
        productId: item.productId,
        productTitle: product.title,
        sku: product.sku,
        quantity: item.quantity,
        unitPrice: unitPrice,
        totalPrice: totalPrice,
        trackInventory: product.trackInventory,
      };
    });
  }
  private calculatedOrder(
    orderItems: {
      productId: string;
      productTitle: string;
      sku: string | null;
      quantity: number;
      unitPrice: Decimal;
      totalPrice: Decimal;
      trackInventory?: boolean;
    }[],
  ) {
    let itemCount = 0;
    let subtotalPrice = new Decimal(0);

    for (const item of orderItems) {
      itemCount += item.quantity;
      subtotalPrice = subtotalPrice.plus(item.totalPrice);
    }

    return {
      itemCount,
      subtotalPrice,
      totalPrice: subtotalPrice,
    };
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
