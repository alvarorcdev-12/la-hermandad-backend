import { Decimal } from '@prisma/client/runtime/client';
import { CustomerResponseDto } from '../dto/customer-response.dto';

import type { Customer } from 'src/generated/prisma/client';

interface CustomerDBResponse extends Customer {
  _count: {
    orders: number;
  };
  orders: {
    id: string;
    orderName: string;
    totalPrice: Decimal;
    createdAt: Date;
  }[];
}

export class CustomersMapper {
  static toCustomerResponseDto(
    customer: CustomerDBResponse,
  ): CustomerResponseDto {
    const amountSpent = customer.orders.reduce(
      (acc, order) => acc + Number(order.totalPrice),
      0,
    );

    const lastOrder = customer.orders[0] ?? null;

    return {
      id: customer.id,
      displayName: `${customer.firstName}${customer.lastName ? ` ${customer.lastName}` : ''}`,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      note: customer.note,
      amountSpent: new Decimal(amountSpent),
      lastOrder: lastOrder
        ? {
            id: lastOrder.id,
            orderName: lastOrder.orderName,
            totalPrice: lastOrder.totalPrice,
            createdAt: lastOrder.createdAt,
          }
        : null,
      numberOfOrders: customer._count.orders,
      canDelete: customer._count.orders === 0,
      createdAt: customer.createdAt,
    };
  }

  static toCustomerResponseDtoList(
    customers: CustomerDBResponse[],
  ): CustomerResponseDto[] {
    return customers.map((customer) => this.toCustomerResponseDto(customer));
  }
}
