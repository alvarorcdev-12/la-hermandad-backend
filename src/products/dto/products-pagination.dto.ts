import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { ProductStatus } from '../../generated/prisma/enums.js';

export class ProductsPaginationDto extends PaginationDto {
  @IsEnum(ProductStatus)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Estado o rol permitido',
    enum: ProductStatus,
    enumName: 'ProductStatus',
  })
  status?: ProductStatus;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description:
      'Nombre exacto de categoría, sin distinguir mayúsculas; no es un UUID',
    example: 'Bebidas',
    type: 'string',
  })
  category?: string;
}
