import { Product } from '../entities/product.entity.js';

import type { ProductGetPayload } from '../../generated/prisma/models.js';

type ProductDB = ProductGetPayload<{
  include: {
    category: {
      select: {
        id: true;
        name: true;
      };
    };
  };
}>;

export class ProductsMapper {
  static toEntity(product: ProductDB): Product {
    const category = product.category
      ? {
          id: product.category.id,
          name:
            product.category.name.charAt(0).toUpperCase() +
            product.category.name.slice(1),
        }
      : null;

    return {
      id: product.id,
      title: product.title,
      description: product.description,
      sku: product.sku,
      price: product.price,
      costPrice: product.costPrice,
      compareAtPrice: product.compareAtPrice,
      trackInventory: product.trackInventory,
      inventoryQuantity: product.inventoryQuantity,
      status: product.status,
      category: category,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  static toEntityList(products: ProductDB[]): Product[] {
    return products.map((product) => this.toEntity(product));
  }
}
