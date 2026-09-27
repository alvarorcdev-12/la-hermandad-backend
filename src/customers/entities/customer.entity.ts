import { Decimal } from '@prisma/client/runtime/client';

export class Customer {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  note: string | null;
  amountSpent: Decimal;
  numberOfOrders: number;
  canDelete: boolean;
  createdAt: Date;
}
