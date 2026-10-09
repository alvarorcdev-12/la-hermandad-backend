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

import type { Order, Product, User } from '../generated/prisma/client.js';
import type {
  DateTimeFilter,
  OrderOrderByWithRelationInput,
  OrderWhereInput,
} from '../generated/prisma/models.js';

import { Prisma } from '../generated/prisma/client.js';

import { OrderStatsDto } from './dto/order-stats.dto.js';
import type { OrderResponseDto } from './dto/order-response.dto.js';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private readonly prismaService: PrismaService) {}

  private readonly orderInclude = {
    orderItems: { where: { quantity: { gt: 0 } } },
    customer: true,
  } satisfies Prisma.OrderInclude;

  async create(createOrderDto: CreateOrderDto, user: User) {
    const { customerId, email, phone, note, items } = createOrderDto;
    const storeId = user.storeId;

    const order = await this.runTransaction(async (tx) => {
      // Allocate the number atomically; rollback also rolls back the counter.
      const settings = await tx.storeSetting.update({
        where: { storeId },
        data: { nextOrderNumber: { increment: 1 } },
        select: { nextOrderNumber: true, orderPrefix: true, orderSuffix: true },
      });
      const orderNumber = settings.nextOrderNumber - 1n;
      const location = await tx.location.findFirst({
        where: { storeId, isDefault: true, isActive: true },
        select: { id: true },
      });
      if (!location) {
        throw new BadRequestException(
          'Configure una ubicación predeterminada activa.',
        );
      }
      const customer = await this.resolveCustomer(tx, customerId, storeId);
      const products = await tx.product.findMany({
        where: { id: { in: items.map((item) => item.productId) }, storeId },
      });
      const orderItems = this.buildOrderItems(items, products);
      const totals = this.calculatedOrder(orderItems);
      await this.decrementInventory(tx, storeId, orderItems);

      return tx.order.create({
        data: {
          userId: user.id,
          storeId,
          locationId: location.id,
          customerId: customer?.id ?? null,
          orderNumber,
          orderName: `${settings.orderPrefix}${orderNumber}${settings.orderSuffix}`,
          ...totals,
          email: email === undefined ? customer?.email : email,
          phone: phone === undefined ? customer?.phone : phone,
          note,
          orderItems: {
            createMany: {
              data: orderItems.map((item) => ({
                productId: item.productId,
                productTitle: item.productTitle,
                sku: item.sku,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
              })),
            },
          },
        },
        include: this.orderInclude,
      });
    });
    return OrdersMapper.toOrderResponseDto(order);
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
    const { email, phone, note, customerId } = updateOrderDto;
    const order = await this.runTransaction(async (tx) => {
      await this.getOrder(tx, id, storeId);
      await this.resolveCustomer(tx, customerId, storeId);
      return tx.order.update({
        where: { id, storeId },
        data: { email, phone, note, customerId },
        include: this.orderInclude,
      });
    });
    return OrdersMapper.toOrderResponseDto(order);
  }

  async addItems(id: string, storeId: string, addItemsDto: AddItemsDto) {
    const items = addItemsDto.productIds.map((productId) => ({
      productId,
      quantity: 1,
    }));
    const order = await this.runTransaction(async (tx) => {
      const currentOrder = await this.getOrder(tx, id, storeId);
      await this.assertUnpaidOpenOrder(tx, currentOrder);
      const products = await tx.product.findMany({
        where: { id: { in: addItemsDto.productIds }, storeId },
      });
      const orderItems = this.buildOrderItems(items, products);
      const totals = this.calculatedOrder([
        ...currentOrder.orderItems,
        ...orderItems,
      ]);
      await this.decrementInventory(tx, storeId, orderItems);
      return tx.order.update({
        where: { id, storeId },
        data: {
          ...totals,
          orderItems: {
            createMany: {
              data: orderItems.map((item) => ({
                productId: item.productId,
                productTitle: item.productTitle,
                sku: item.sku,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
              })),
            },
          },
        },
        include: this.orderInclude,
      });
    });
    return OrdersMapper.toOrderResponseDto(order);
  }

  async editItemQuantity(
    id: string,
    itemId: string,
    editItemQuantityDto: EditItemQuantityDto,
    storeId: string,
  ) {
    const { quantity: newQuantity, restock } = editItemQuantityDto;
    this.validateQuantity(newQuantity, true);
    const order = await this.runTransaction(async (tx) => {
      const currentOrder = await this.getOrder(tx, id, storeId);
      await this.assertUnpaidOpenOrder(tx, currentOrder);
      const currentItem = await tx.orderItem.findFirst({
        where: { id: itemId, orderId: id, order: { storeId } },
        include: { product: true },
      });
      if (!currentItem) {
        throw new NotFoundException('No se encontró el artículo del pedido.');
      }
      this.assertEligibleProduct(currentItem.product, storeId);
      const delta = newQuantity - currentItem.quantity;
      const totalPrice = currentItem.unitPrice.mul(newQuantity);
      const items = currentOrder.orderItems.filter(
        (item) => item.id !== itemId,
      );
      if (newQuantity > 0) {
        items.push({ ...currentItem, quantity: newQuantity, totalPrice });
      }
      const totals = this.calculatedOrder(items);
      if (delta === 0) return currentOrder;

      if (currentItem.product.trackInventory) {
        if (delta > 0) {
          await this.decrementInventory(tx, storeId, [
            {
              productId: currentItem.productId,
              quantity: delta,
              trackInventory: true,
            },
          ]);
        } else if (restock) {
          await tx.product.update({
            where: { id: currentItem.productId, storeId },
            data: { inventoryQuantity: { increment: -delta } },
          });
        }
      }
      await tx.orderItem.update({
        where: { id: itemId, orderId: id },
        data: { quantity: newQuantity, totalPrice },
      });
      return tx.order.update({
        where: { id, storeId },
        data: totals,
        include: this.orderInclude,
      });
    });
    return OrdersMapper.toOrderResponseDto(order);
  }

  async orderOpen(id: string, storeId: string): Promise<OrderResponseDto> {
    await this.findOne(id, storeId);
    throw new BadRequestException(
      'No se permite reabrir pedidos. Cree un nuevo pedido.',
    );
  }

  async orderCancel(
    id: string,
    storeId: string,
    cancelOrderDto: CancelOrderDto,
  ) {
    const order = await this.runTransaction(async (tx) => {
      const currentOrder = await this.getOrder(tx, id, storeId);
      if (currentOrder.status === 'CANCELLED') return currentOrder;
      await this.assertUnpaidOpenOrder(tx, currentOrder);
      if (!cancelOrderDto.reason.trim()) {
        throw new BadRequestException('Indique el motivo de cancelación.');
      }
      const items = await tx.orderItem.findMany({
        where: { orderId: id, order: { storeId }, quantity: { gt: 0 } },
        include: { product: true },
        orderBy: [{ productId: 'asc' }, { id: 'asc' }],
      });
      // Preserve the existing cancellation contract: always restore tracked stock.
      for (const item of items) {
        if (item.product.storeId !== storeId) {
          throw new BadRequestException(
            'El producto no pertenece a esta tienda.',
          );
        }
        if (item.product.trackInventory) {
          await tx.product.update({
            where: { id: item.productId, storeId },
            data: { inventoryQuantity: { increment: item.quantity } },
          });
        }
      }
      return tx.order.update({
        where: { id, storeId },
        data: {
          status: 'CANCELLED',
          financialStatus: 'VOIDED',
          cancelReason: cancelOrderDto.reason,
          cancelledAt: new Date(),
        },
        include: this.orderInclude,
      });
    });
    return OrdersMapper.toOrderResponseDto(order);
  }

  async orderClose(id: string, storeId: string) {
    const order = await this.runTransaction(async (tx) => {
      const currentOrder = await this.getOrder(tx, id, storeId);
      const paid = await this.getPaidAmount(tx, id, storeId);
      this.validateMoney(currentOrder.totalPrice);
      if (
        !['OPEN', 'CLOSED'].includes(currentOrder.status) ||
        currentOrder.financialStatus !== 'PAID' ||
        !paid.equals(currentOrder.totalPrice) ||
        !currentOrder.paidAt
      ) {
        throw new BadRequestException(
          'Solo se pueden cerrar pedidos completamente pagados y coherentes con sus pagos.',
        );
      }
      if (currentOrder.status === 'CLOSED' && currentOrder.closedAt)
        return currentOrder;
      return tx.order.update({
        where: { id, storeId },
        data: {
          status: 'CLOSED',
          closedAt: currentOrder.closedAt ?? new Date(),
        },
        include: this.orderInclude,
      });
    });
    return OrdersMapper.toOrderResponseDto(order);
  }

  async addPayment(
    id: string,
    storeId: string,
    createPaymentDto: CreatePaymentDto,
  ) {
    const amount = new Decimal(createPaymentDto.amount);
    if (amount.greaterThan('9999999999.99')) {
      throw new BadRequestException('El importe supera el máximo permitido.');
    }
    return this.runTransaction(async (tx) => {
      const order = await this.getOrder(tx, id, storeId);
      if (
        order.status !== 'OPEN' ||
        !['PENDING', 'PARTIALLY_PAID'].includes(order.financialStatus)
      ) {
        throw new BadRequestException('El pedido no admite pagos.');
      }
      this.validateMoney(order.totalPrice);
      const paid = await this.getPaidAmount(tx, id, storeId);
      const remainingBalance = order.totalPrice.minus(paid);
      if (amount.greaterThan(remainingBalance)) {
        throw new BadRequestException(
          'El importe del pago excede el saldo pendiente.',
        );
      }
      await tx.payment.create({
        data: {
          orderId: id,
          amount,
          method: createPaymentDto.method,
          reference: createPaymentDto.reference,
          note: createPaymentDto.note,
        },
      });
      const fullyPaid = amount.equals(remainingBalance);
      const now = new Date();
      await tx.order.update({
        where: { id, storeId },
        data: {
          financialStatus: fullyPaid ? 'PAID' : 'PARTIALLY_PAID',
          status: fullyPaid ? 'CLOSED' : 'OPEN',
          paidAt: fullyPaid ? now : null,
          closedAt: fullyPaid ? now : null,
        },
      });
      return {
        amount,
        method: createPaymentDto.method,
        remainingBalance: remainingBalance.minus(amount),
      };
    });
  }

  private async runTransaction<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    // Retry only confirmed rollbacks. This does not make HTTP requests idempotent.
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.prismaService.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error: unknown) {
        if (
          error instanceof PrismaClientKnownRequestError &&
          error.code === 'P2034' &&
          attempt < maxAttempts
        ) {
          continue;
        }
        this.handleDBExceptions(error);
      }
    }
    throw new ConflictException(
      'El pedido cambió durante la operación. Consulte su estado e intente nuevamente.',
    );
  }

  private async getOrder(
    tx: Prisma.TransactionClient,
    id: string,
    storeId: string,
  ) {
    const order = await tx.order.findFirst({
      where: { id, storeId },
      include: this.orderInclude,
    });
    if (!order)
      throw new NotFoundException('No se encontró el pedido en esta tienda.');
    return order;
  }

  private async assertUnpaidOpenOrder(
    tx: Prisma.TransactionClient,
    order: Order,
  ) {
    const paymentCount = await tx.payment.count({
      where: { orderId: order.id, order: { storeId: order.storeId } },
    });
    if (
      order.status !== 'OPEN' ||
      order.financialStatus !== 'PENDING' ||
      paymentCount > 0
    ) {
      throw new BadRequestException(
        'Solo se pueden modificar o cancelar pedidos abiertos sin pagos.',
      );
    }
  }

  private async getPaidAmount(
    tx: Prisma.TransactionClient,
    orderId: string,
    storeId: string,
  ) {
    const payments = await tx.payment.findMany({
      where: { orderId, order: { storeId } },
      select: { amount: true },
    });
    return payments.reduce((sum, payment) => {
      this.validateMoney(payment.amount);
      return sum.plus(payment.amount);
    }, new Decimal(0));
  }

  private async resolveCustomer(
    tx: Prisma.TransactionClient,
    customerId: string | null | undefined,
    storeId: string,
  ) {
    if (customerId === undefined || customerId === null) return null;
    const customer = await tx.customer.findFirst({
      where: { id: customerId, storeId },
      select: { id: true, email: true, phone: true },
    });
    if (!customer)
      throw new BadRequestException('El cliente no existe en esta tienda.');
    return customer;
  }

  private validateQuantity(quantity: number, allowZero = false) {
    // Prisma Int is a PostgreSQL signed 32-bit integer.
    if (
      !Number.isInteger(quantity) ||
      quantity < (allowZero ? 0 : 1) ||
      quantity > 2147483647
    ) {
      throw new BadRequestException(
        'La cantidad debe ser un entero dentro del rango permitido.',
      );
    }
  }

  private validateMoney(amount: Decimal, allowZero = false) {
    if (
      !amount.isFinite() ||
      amount.lessThan(allowZero ? 0 : '0.01') ||
      amount.decimalPlaces() > 2 ||
      amount.greaterThan('9999999999.99')
    ) {
      throw new BadRequestException(
        'El importe debe estar dentro del rango permitido y tener como máximo dos decimales.',
      );
    }
  }

  private assertEligibleProduct(product: Product, storeId: string) {
    if (product.storeId !== storeId || product.status !== 'ACTIVE') {
      throw new BadRequestException(
        'El producto no está disponible en esta tienda.',
      );
    }
  }

  private buildOrderItems(items: OrderItemDto[], products: Product[]) {
    return items.map((item) => {
      const product = products.find(
        (candidate) => candidate.id === item.productId,
      );
      if (!product || product.status !== 'ACTIVE') {
        throw new BadRequestException(
          'Uno de los productos no existe o no está disponible en esta tienda.',
        );
      }
      this.validateQuantity(item.quantity);
      this.validateMoney(product.price, true);
      const totalPrice = product.price.mul(item.quantity);
      this.validateMoney(totalPrice, true);
      return {
        productId: product.id,
        productTitle: product.title,
        sku: product.sku,
        quantity: item.quantity,
        unitPrice: product.price,
        totalPrice,
        trackInventory: product.trackInventory,
      };
    });
  }

  private async decrementInventory(
    tx: Prisma.TransactionClient,
    storeId: string,
    items: { productId: string; quantity: number; trackInventory: boolean }[],
  ) {
    // Consistent product ordering across creation, editing and cancellation.
    const trackedItems = items
      .filter((item) => item.trackInventory)
      .sort((a, b) => a.productId.localeCompare(b.productId));
    for (const item of trackedItems) {
      const result = await tx.product.updateMany({
        where: {
          id: item.productId,
          storeId,
          status: 'ACTIVE',
          inventoryQuantity: { gte: item.quantity },
        },
        data: { inventoryQuantity: { decrement: item.quantity } },
      });
      if (result.count !== 1) {
        throw new BadRequestException(
          'Existencias insuficientes o producto no disponible.',
        );
      }
    }
  }

  private calculatedOrder(
    orderItems: { quantity: number; unitPrice: Decimal; totalPrice: Decimal }[],
  ) {
    let itemCount = 0;
    let subtotalPrice = new Decimal(0);
    for (const item of orderItems) {
      this.validateQuantity(item.quantity);
      this.validateMoney(item.unitPrice, true);
      this.validateMoney(item.totalPrice, true);
      if (!item.totalPrice.equals(item.unitPrice.mul(item.quantity))) {
        throw new BadRequestException(
          'Los importes del artículo son inconsistentes.',
        );
      }
      itemCount += item.quantity;
      subtotalPrice = subtotalPrice.plus(item.totalPrice);
    }
    this.validateQuantity(itemCount);
    this.validateMoney(subtotalPrice);
    return { itemCount, subtotalPrice, totalPrice: subtotalPrice };
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

  private handleDBExceptions(error: unknown): never {
    if (error instanceof HttpException) throw error;
    if (error instanceof PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          throw new ConflictException(
            'El registro ya existe. Consulte el estado del pedido.',
          );
        case 'P2025':
          throw new NotFoundException('No se encontró el registro requerido.');
        case 'P2003':
          throw new BadRequestException(
            'Una referencia no existe o está en uso.',
          );
        case 'P2000':
        case 'P2020':
        case 'P2023':
          throw new BadRequestException(
            'Los datos están fuera del formato o rango permitido.',
          );
        case 'P2034':
          throw new ConflictException(
            'El pedido cambió durante la operación. Consulte su estado e intente nuevamente.',
          );
      }
    }
    // Do not log database details, query parameters or customer information.
    this.logger.error('Unexpected error in OrdersService');
    throw new InternalServerErrorException(
      'No se pudo confirmar la operación. Consulte el estado del pedido antes de repetirla.',
    );
  }
}
