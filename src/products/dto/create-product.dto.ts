import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ProductStatus } from '../../generated/prisma/enums.js';

export class CreateProductDto {
  @IsString()
  @ApiProperty({ description: 'Título del producto.', type: String })
  title: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Descripción.',
    nullable: true,
    type: String,
  })
  description?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Código SKU.',
    nullable: true,
    type: String,
  })
  sku?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @ApiProperty({
    description: 'Precio de venta; máximo dos decimales.',
    minimum: 0,
    type: Number,
  })
  price: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Costo; máximo dos decimales.',
    nullable: true,
    minimum: 0,
    type: Number,
  })
  costPrice?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Precio de comparación; máximo dos decimales.',
    nullable: true,
    minimum: 0,
    type: Number,
  })
  compareAtPrice?: number;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Indica si se controla el inventario.',
    nullable: true,
    type: Boolean,
  })
  trackInventory?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Existencias del producto.',
    nullable: true,
    minimum: 0,
    type: Number,
  })
  inventoryQuantity?: number;

  @IsEnum(ProductStatus)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Estado.',
    nullable: true,
    enum: ProductStatus,
    enumName: 'ProductStatus',
  })
  status?: ProductStatus;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Identificador de la categoría.',
    nullable: true,
    type: String,
  })
  categoryId?: string;
}
