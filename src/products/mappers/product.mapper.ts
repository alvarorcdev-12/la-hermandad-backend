import { ProductGetPayload } from 'src/generated/prisma/models';
import { Product } from '../entities/product.entity';

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
      category: product.category,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  static toEntityList(products: ProductDB[]): Product[] {
    return products.map((product) => this.toEntity(product));
  }
}
