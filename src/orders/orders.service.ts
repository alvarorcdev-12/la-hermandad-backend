import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import { PrismaService } from 'src/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderItemDto } from './dto/order-item.dto';
import { OrdersPaginationDto } from './dto/orders-pagination.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrdersMapper } from './mapper/orders.mapper';

import type { Product, User } from 'src/generated/prisma/client';
import { AddItemsDto } from './dto/add-items.dto';

@Injectable()
export class OrdersService {
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
        const { subtotalPrice, totalPirce, itemCount } =
          this.calculatedOrder(orderItems);

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
            orderItems: true,
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
      console.log({ error });
      throw new InternalServerErrorException('Internal Server Error ');
    }
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
        orderItems: true,
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
          orderItems: true,
          customer: true,
        },
      });

      return OrdersMapper.toOrderResponseDto(updateOrder);
    } catch (error) {
      console.log({ error });
      throw new InternalServerErrorException('Internal Server Error ');
    }
  }

  // Items
  async addItems(id: string, storeId: string, addItemsDto: AddItemsDto) {
    const order = await this.findOne(id, storeId);

    if (order.status === 'CLOSED') {
      throw new BadRequestException(
        'The order must be open to add items or remove items.',
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
          orderItems: true,
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
      const { itemCount, subtotalPrice, totalPirce } = this.calculatedOrder(
        updateOrderItems.orderItems,
      );

      // 5. actualizar el pedido con los nuevos totales y items
      const updateOrderWithItems = await tx.order.update({
        where: { id: id, storeId: storeId },
        data: {
          itemCount: itemCount,
          subtotalPrice: subtotalPrice,
          totalPrice: totalPirce,
        },
        include: {
          orderItems: true,
          customer: true,
        },
      });

      return updateOrderWithItems;
    });

    return OrdersMapper.toOrderResponseDto(prismaTx);
  }

  async orderCancel(id: string, storeId: string) {
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
      totalPirce: subtotalPrice,
    };
  }
}
