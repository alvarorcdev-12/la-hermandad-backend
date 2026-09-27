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
import { PrismaService } from '../prisma.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { OrderItemDto } from './dto/order-item.dto.js';
import { OrdersPaginationDto } from './dto/orders-pagination.dto.js';
import { UpdateOrderDto } from './dto/update-order.dto.js';
import { AddItemsDto } from './dto/add-items.dto.js';
import { EditItemQuantityDto } from './dto/edit-item-quantity.dto.js';
import { CancelOrderDto } from './dto/cancel-order.dto.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';

import { OrdersMapper } from './mapper/orders.mapper.js';

import type {
  FinancialStatus,
  Order,
  Product,
  User,
} from '../generated/prisma/client.js';
import type {
  DateTimeFilter,
  OrderOrderByWithRelationInput,
  OrderWhereInput,
} from '../generated/prisma/models.js';
import type { TransactionClient } from '../generated/prisma/internal/prismaNamespace.js';
import { OrderStatsDto } from './dto/order-stats.dto.js';

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
          totalPrice: totalPrice,
          itemCount,
        } = this.calculatedOrder(orderItems);

        // 7. Decremental invetoryQuantity si product.trackInventory = true

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
                `Existencias insuficientes para el producto "${trackedProducts[index].productTitle}".`,
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
            totalPrice: totalPrice,
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

    // const dateFilter = this.buildDateFilter(startDate, endDate);

    const orderBy: OrderOrderByWithRelationInput = {
      [sort ?? 'createdAt']: direction ?? 'desc',
    };

    const where: OrderWhereInput = {
      storeId: storeId,
      status: status,
      // ...dateFilter,
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

  async getOrderStats(storeId: string, orderStatsDto: OrderStatsDto) {
    const { startDate, endDate } = orderStatsDto;

    const dateFilter = this.buildDateFilter(startDate, endDate);

    const where: OrderWhereInput = {
      storeId: storeId,
      ...dateFilter,
      status: { not: 'CANCELLED' },
    };

    const [total, sumTotalPrice, sumItemCount, closedOrders, cancelledOrders] =
      await Promise.all([
        // Total pedidos
        this.prismaService.order.aggregate({
          where: where,
          _count: { id: true },
        }),
        // Suma de totalPrice
        this.prismaService.order.aggregate({
          where: where,
          _sum: { totalPrice: true },
        }),

        // Suma itemCount
        this.prismaService.order.aggregate({
          where: where,
          _sum: { itemCount: true },
        }),
        // Orders cerrados
        this.prismaService.order.aggregate({
          where: { ...where, status: 'CLOSED' },
          _count: { id: true },
        }),
        // Orders cancelados
        this.prismaService.order.aggregate({
          where: {
            storeId,
            ...dateFilter,
            status: 'CANCELLED',
          },
          _count: { id: true },
        }),
      ]);

    return {
      orders: total._count.id,
      sales: sumTotalPrice._sum.totalPrice || new Decimal(0),
      items: sumItemCount._sum.itemCount || 0,
      closedOrders: closedOrders._count.id,
      cancelledOrders: cancelledOrders._count.id,
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
      throw new NotFoundException(`Pedido con id: ${id} no encontrado`);
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
      throw new BadRequestException(
        'El pedido debe estar abierto para agregar artículos',
      );
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
              `Existencias insuficientes para el producto "${trackedProducts[index].productTitle}".`,
            );
          }
        });
      }

      // 4. calcular total del pedido
      const {
        itemCount,
        subtotalPrice,
        totalPrice: totalPrice,
      } = this.calculatedOrder(updateOrderItems.orderItems);

      // 5. actualizar el pedido con los nuevos totales y items
      const updateOrderWithItems = await tx.order.update({
        where: { id: id, storeId: storeId },
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
        'El pedido debe estar abierto para modificar la cantidad de un artículo.',
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
              `Existencias insuficientes para el producto "${currentItem.product.title}".`,
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
        'Solo los pedidos cerrados pueden volver a abrirse.',
      );
    }

    if (order.financialStatus === 'VOIDED') {
      throw new BadRequestException(
        'Los pedidos anulados no pueden volver a abrirse. Cree un nuevo pedido.',
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
      throw new BadRequestException('No se puede cancelar un pedido cerrado.');
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
      throw new BadRequestException(
        'No se puede cerrar un pedido que no está abierto.',
      );
    }

    const invalidFinancialStatuses = ['PENDING', 'PARTIALLY_PAID'];
    if (invalidFinancialStatuses.includes(order.financialStatus)) {
      throw new BadRequestException(
        `No se puede cerrar el pedido. El estado financiero es ${order.financialStatus}. Todas las transacciones deben estar finalizadas (pagadas, reembolsadas, etc.).`,
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

  // Payments
  addPayment(id: string, storeId: string, createPaymentDto: CreatePaymentDto) {
    return this.prismaService.$transaction(async (tx) => {
      // 1. Obtener order
      const order = await tx.order.findFirstOrThrow({
        where: {
          id: id,
          storeId: storeId,
        },
      });

      if (order.financialStatus === 'PAID') {
        throw new BadRequestException(
          'No se pueden agregar pagos a un pedido que ya está pagado en su totalidad.',
        );
      }

      if (order.status === 'CANCELLED' || order.status === 'CLOSED') {
        throw new BadRequestException(
          `No se pueden agregar pagos a un pedido con estado ${order.status}.`,
        );
      }

      const payment = await tx.payment.create({
        data: {
          orderId: id,
          amount: new Decimal(createPaymentDto.amount),
          method: createPaymentDto.method,
          reference: createPaymentDto.reference,
          note: createPaymentDto.note,
        },
      });

      const { financialStatus, paidAt } = await this.recalculateFinancialStatus(
        tx,
        order,
      );

      // 5. Actualizar la orden
      await tx.order.update({
        where: { id: order.id },
        data: {
          financialStatus,
          paidAt, // Se setea solo si está totalmente pagada
        },
      });

      return payment;
    });
  }

  private buildOrderItems(items: OrderItemDto[], productsDB: Product[]) {
    return items.map((item) => {
      const product = productsDB.find((p) => p.id === item.productId);
      if (!product) {
        throw new BadRequestException(
          `No se encontró el producto con id: ${item.productId}.`,
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
  private async recalculateFinancialStatus(
    tx: TransactionClient,
    order: Order,
  ) {
    // Obtener TODOS los pagos de la orden
    const payments = await tx.payment.findMany({
      where: { orderId: order.id },
    });

    // Sumar los pagos usando Decimal de Prisma
    const totalPaid = payments.reduce(
      (sum, payment) => sum.plus(payment.amount),
      new Decimal(0),
    );

    let financialStatus: FinancialStatus = 'PENDING';
    let paidAt: Date | null = order.paidAt; // Mantener el histórico si ya estaba pagada

    // Comparar lo pagado vs el total de la orden
    if (totalPaid.greaterThanOrEqualTo(order.totalPrice)) {
      // Se pasó del total o es exacto
      financialStatus = 'PAID';
      if (!order.paidAt) {
        paidAt = new Date(); // Seteamos el timestamp solo la primera vez
      }
    } else if (totalPaid.greaterThan(0)) {
      // Pagó algo, pero le falta
      financialStatus = 'PARTIALLY_PAID';
    }

    return { financialStatus, paidAt };
  }

  private buildDateFilter(startDate?: string, endDate?: string) {
    const dateFilter: DateTimeFilter<'Order'> = {};

    if (!startDate && !endDate) {
      const now = new Date();
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      const endOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999,
      );

      dateFilter.gte = startOfDay;
      dateFilter.lte = endOfDay;
    } else {
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        dateFilter.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
    }

    return Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};
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
