import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { OrderStatus } from '../../generated/prisma/enums.js';

export class OrdersPaginationDto extends PaginationDto {
  @IsEnum(OrderStatus)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Estado o rol permitido',
    enum: OrderStatus,
    enumName: 'OrderStatus',
  })
  status?: OrderStatus;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({
    description:
      'Aceptado y validado, pero actualmente no se aplica al listado. Usar /orders/stats para filtrar estadísticas por fecha.',
    example: '2026-09-01',
    type: 'string',
  })
  startDate?: string;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({
    description:
      'Aceptado y validado, pero actualmente no se aplica al listado. Usar /orders/stats para filtrar estadísticas por fecha.',
    example: '2026-09-27',
    type: 'string',
  })
  endDate?: string;
}
