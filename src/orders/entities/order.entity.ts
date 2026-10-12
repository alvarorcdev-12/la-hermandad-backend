import { Decimal } from '@prisma/client/runtime/client';
import { FinancialStatus, OrderStatus } from '../../generated/prisma/enums.js';

import type { Customer } from '../../generated/prisma/client.js';

export class Order {
  id: string;
  number: number;
  name: string;
  itemCount: number;
  subtotalPrice: Decimal;
  discountAmount: Decimal;
  discountReason: string | null;
  totalPrice: Decimal;
  email: string | null;
  phone: string | null;
  note: string | null;
  customer: Customer | null;
  financialStatus: FinancialStatus;
  status: OrderStatus;
  cancelledAt: Date | null;
  cancelReason: string | null;
  closedAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  updateAt: Date;
  items: {
    id: string;
    productId: string;
    title: string;
    quantity: number;
    unitPrice: Decimal;
    totalPrice: Decimal;
    sku: string | null;
  }[];
}
