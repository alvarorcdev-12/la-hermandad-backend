import { Decimal } from '@prisma/client/runtime/client';

export class CustomerResponseDto {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  note: string | null;
  amountSpent: Decimal;
  lastOrder: {
    id: string;
    orderName: string;
    totalPrice: Decimal;
    createdAt: Date;
  } | null;
  numberOfOrders: number;
  canDelete: boolean;
  createdAt: Date;
}
