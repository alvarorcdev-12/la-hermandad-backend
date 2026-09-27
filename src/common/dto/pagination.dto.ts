import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsPositive, IsString } from 'class-validator';

export class PaginationDto {
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Página solicitada; enviar un entero positivo',
    example: 1,
    type: 'number',
    minimum: 0,
    exclusiveMinimum: true,
    default: 1,
  })
  page?: number;

  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Elementos por página; enviar un entero positivo',
    example: 10,
    type: 'number',
    minimum: 0,
    exclusiveMinimum: true,
    default: 10,
  })
  limit?: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Texto de búsqueda, sin distinguir mayúsculas',
    example: 'cafe',
    type: 'string',
  })
  q?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description:
      'Campo del modelo Prisma para ordenar; no usar nombres calculados de la respuesta',
    example: 'createdAt',
    type: 'string',
    default: 'createdAt',
  })
  sort?: string;

  @IsIn(['asc', 'desc'])
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Dirección del orden',
    example: 'desc',
    default: 'desc',
    enum: ['asc', 'desc'],
  })
  direction?: 'asc' | 'desc';
}
