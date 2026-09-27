import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { ProductStatus } from '../../generated/prisma/enums.js';

export class CreateProductDto {
  @IsString()
  @MinLength(3)
  @ApiProperty({
    description: 'Nombre del producto',
    example: 'Café',
    type: 'string',
    minLength: 3,
  })
  title: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Descripción',
    example: 'Descripción de ejemplo',
    type: 'string',
  })
  description?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Código SKU, único por tienda',
    example: 'CAF-001',
    type: 'string',
  })
  sku?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @ApiProperty({
    description: 'Precio de venta',
    example: 25.5,
    type: 'number',
    minimum: 0.0,
  })
  price: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Costo del producto',
    example: 15,
    type: 'number',
    minimum: 0.0,
  })
  costPrice?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Precio de comparación',
    example: 30,
    type: 'number',
    minimum: 0.0,
  })
  compareAtPrice?: number;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Controlar existencias',
    example: true,
    type: 'boolean',
  })
  trackInventory?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Existencias del producto; enviar un entero',
    example: 20,
    type: 'number',
    minimum: 0.0,
  })
  inventoryQuantity?: number;

  @IsEnum(ProductStatus)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Estado o rol permitido',
    enum: ProductStatus,
    enumName: 'ProductStatus',
  })
  status?: ProductStatus;

  @IsUUID()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Identificador UUID del recurso',
    example: '123e4567-e89b-42d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  categoryId?: string;
}
