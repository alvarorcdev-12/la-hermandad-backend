import { Product } from 'src/generated/prisma/client';
import { ProductResponseDto } from '../dto/product-response.dto';

interface ProductDBResponse extends Product {
  category: {
    id: string;
    name: string;
  } | null;
}

export class ProductsMapper {
  static toProductResponseDto(product: ProductDBResponse): ProductResponseDto {
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
    };
  }

  static toProductResponseDtoList(
    products: ProductDBResponse[],
  ): ProductResponseDto[] {
    return products.map((product) => this.toProductResponseDto(product));
  }
}
