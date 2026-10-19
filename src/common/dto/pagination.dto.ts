import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsPositive, IsString } from 'class-validator';

export class PaginationDto {
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Página solicitada; el servicio usa 1 si se omite.',
    nullable: true,
    minimum: 0,
    exclusiveMinimum: true,
    type: Number,
  })
  page?: number;

  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Tamaño de página; el servicio usa 10 si se omite.',
    nullable: true,
    minimum: 0,
    exclusiveMinimum: true,
    type: Number,
  })
  limit?: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description:
      'Búsqueda parcial sin distinguir mayúsculas; los campos dependen del módulo.',
    nullable: true,
    type: String,
  })
  q?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description:
      'Campo del modelo para ordenar; por defecto createdAt. No se valida una lista de campos permitidos.',
    nullable: true,
    type: String,
  })
  sort?: string;

  @IsIn(['asc', 'desc'])
  @IsOptional()
  @ApiPropertyOptional({
    description:
      'Dirección; asc por defecto en usuarios y desc en los demás módulos.',
    nullable: true,
    enum: ['asc', 'desc'],
    type: String,
  })
  direction?: 'asc' | 'desc';
}
