import { ApiProperty } from '@nestjs/swagger';
import { ProductCategoryResponseDto } from '../../common/openapi/response.dto.js';
import { Decimal } from '@prisma/client/runtime/client';
import { ProductStatus } from '../../generated/prisma/enums.js';

export class Product {
  @ApiProperty({
    description: 'Identificador.',
    type: 'string',
    format: 'uuid',
  })
  id: string;
  @ApiProperty({ description: 'Título.', type: 'string' })
  title: string;
  @ApiProperty({ description: 'Descripción.', nullable: true, type: 'string' })
  description: string | null;
  @ApiProperty({ description: 'Código SKU.', nullable: true, type: 'string' })
  sku: string | null;
  @ApiProperty({
    description: 'Precio de venta. Decimal serializado como cadena.',
    type: 'string',
    example: '125.5',
  })
  price: Decimal;
  @ApiProperty({
    description: 'Costo. Decimal serializado como cadena.',
    nullable: true,
    type: 'string',
    example: '125.5',
  })
  costPrice: Decimal | null;
  @ApiProperty({
    description: 'Precio de comparación. Decimal serializado como cadena.',
    nullable: true,
    type: 'string',
    example: '125.5',
  })
  compareAtPrice: Decimal | null;
  @ApiProperty({ description: 'Control de inventario.', type: 'boolean' })
  trackInventory: boolean;
  @ApiProperty({ description: 'Existencias.', type: 'number' })
  inventoryQuantity: number;
  @ApiProperty({
    description: 'Estado.',
    enum: ProductStatus,
    enumName: 'ProductStatus',
  })
  status: ProductStatus;
  @ApiProperty({
    description: 'Categoría.',
    nullable: true,
    type: () => ProductCategoryResponseDto,
  })
  category: { id: string; name: string } | null;
  @ApiProperty({
    description: 'Fecha de creación.',
    type: 'string',
    format: 'date-time',
  })
  createdAt: Date;
  @ApiProperty({
    description: 'Fecha de actualización.',
    type: 'string',
    format: 'date-time',
  })
  updatedAt: Date;
}
