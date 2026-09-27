import { Decimal } from '@prisma/client/runtime/client';
import { ProductStatus } from 'src/generated/prisma/enums';

export class Product {
  id: string;
  title: string;
  description: string | null;
  sku: string | null;
  price: Decimal;
  costPrice: Decimal | null;
  compareAtPrice: Decimal | null;
  trackInventory: boolean;
  inventoryQuantity: number;
  status: ProductStatus;
  category: {
    id: string;
    name: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}
