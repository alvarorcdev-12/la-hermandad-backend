import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { OrderStatus } from '../../generated/prisma/enums.js';

export class OrdersPaginationDto extends PaginationDto {
  @IsEnum(OrderStatus)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Estado.',
    nullable: true,
    enum: OrderStatus,
    enumName: 'OrderStatus',
  })
  status?: OrderStatus;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({
    description:
      'Fecha ISO aceptada y validada, pero actualmente ignorada por el listado.',
    nullable: true,
    type: String,
  })
  startDate?: string;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({
    description:
      'Fecha ISO aceptada y validada, pero actualmente ignorada por el listado.',
    nullable: true,
    type: String,
  })
  endDate?: string;
}
