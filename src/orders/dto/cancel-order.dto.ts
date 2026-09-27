import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CancelOrderDto {
  @IsString()
  @ApiProperty({
    description: 'Motivo de cancelación',
    example: 'Solicitud del cliente',
    type: 'string',
  })
  reason: string;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    description:
      'Actualmente ignorado: la cancelación siempre repone existencias de productos con control de inventario.',
    example: true,
    type: 'boolean',
    default: true,
  })
  restock?: boolean = true;

  // staffNote?: string;
}
