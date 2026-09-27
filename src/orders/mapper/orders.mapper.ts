import { OrderGetPayload } from 'src/generated/prisma/models';
import { OrderResponseDto } from '../dto/order-response.dto';

type OrderDB = OrderGetPayload<{
  include: { orderItems: true; customer: true };
}>;

export class OrdersMapper {
  static toOrderResponseDto(order: OrderDB): OrderResponseDto {
    return {
      id: order.id,
      number: Number(order.orderNumber),
      name: order.orderName,
      itemCount: order.itemCount,
      subtotalPrice: order.subtotalPrice,
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

  static toOrderResponseDtoList(orders: OrderDB[]): OrderResponseDto[] {
    return orders.map((order) => this.toOrderResponseDto(order));
  }
}
