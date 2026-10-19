import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from '../../generated/prisma/enums.js';
import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto.js';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional({
    nullable: true,
    description: 'Título del producto.',
    type: String,
  })
  declare title?: string;

  @ApiPropertyOptional({
    description: 'Descripción.',
    nullable: true,
    type: String,
  })
  declare description?: string;

  @ApiPropertyOptional({
    description: 'Código SKU.',
    nullable: true,
    type: String,
  })
  declare sku?: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Precio de venta; máximo dos decimales.',
    minimum: 0,
    type: Number,
  })
  declare price?: number;

  @ApiPropertyOptional({
    description: 'Costo; máximo dos decimales.',
    nullable: true,
    minimum: 0,
    type: Number,
  })
  declare costPrice?: number;

  @ApiPropertyOptional({
    description: 'Precio de comparación; máximo dos decimales.',
    nullable: true,
    minimum: 0,
    type: Number,
  })
  declare compareAtPrice?: number;

  @ApiPropertyOptional({
    description: 'Indica si se controla el inventario.',
    nullable: true,
    type: Boolean,
  })
  declare trackInventory?: boolean;

  @ApiPropertyOptional({
    description: 'Existencias del producto.',
    nullable: true,
    minimum: 0,
    type: Number,
  })
  declare inventoryQuantity?: number;

  @ApiPropertyOptional({
    description: 'Estado.',
    nullable: true,
    enum: ProductStatus,
    enumName: 'ProductStatus',
  })
  declare status?: ProductStatus;

  @ApiPropertyOptional({
    description: 'Identificador de la categoría.',
    nullable: true,
    type: String,
  })
  declare categoryId?: string;
}
