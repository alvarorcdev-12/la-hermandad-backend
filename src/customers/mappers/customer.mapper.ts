import { Decimal } from '@prisma/client/runtime/client';

import { Customer } from '../entities/customer.entity.js';
import { CustomerGetPayload } from '../../generated/prisma/models.js';

type CustomerDB = CustomerGetPayload<{
  include: {
    _count: {
      select: {
        orders: true;
      };
    };
    orders: {
      select: {
        totalPrice: true;
      };
    };
  };
}>;

export class CustomerMapper {
  static toEntity(customer: CustomerDB): Customer {
    const amountSpent = customer.orders.reduce(
      (acc, order) => acc + Number(order.totalPrice),
      0,
    );

    return {
      id: customer.id,
      displayName: `${customer.firstName} ${customer.lastName || ''}`,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      note: customer.note,
      amountSpent: new Decimal(amountSpent),
      numberOfOrders: customer._count.orders,
      canDelete: customer._count.orders === 0,
      createdAt: customer.createdAt,
    };
  }

  static toEntityList(customers: CustomerDB[]): Customer[] {
    return customers.map(this.toEntity);
  }
}
