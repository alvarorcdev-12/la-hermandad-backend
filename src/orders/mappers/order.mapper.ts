import { Order } from '../entities/order.entity.js';

import type { OrderGetPayload } from '../../generated/prisma/models.js';

type OrderDB = OrderGetPayload<{
  include: { orderItems: true; customer: true };
}>;

export class OrderMapper {
  static toEntity(order: OrderDB): Order {
    return {
      id: order.id,
      number: Number(order.orderNumber),
      name: order.orderName,
      itemCount: order.itemCount,
      subtotalPrice: order.subtotalPrice,
      discountAmount: order.discountAmount,
      discountReason: order.discountReason,
      totalPrice: order.totalPrice,
      email: order.email,
      phone: order.phone,
      note: order.note,
      financialStatus: order.financialStatus,
      status: order.status,
      cancelledAt: order.cancelledAt,
      cancelReason: order.cancelReason,
      closedAt: order.closedAt,
      paidAt: order.paidAt,
      createdAt: order.createdAt,
      updateAt: order.updatedAt,
      items: order.orderItems.map((item) => {
        return {
          id: item.id,
          productId: item.productId,
          title: item.productTitle,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          sku: item.sku,
        };
      }),
      customer: order.customer,
    };
  }

  static toEntityList(orders: OrderDB[]): Order[] {
    return orders.map((order) => this.toEntity(order));
  }
}
