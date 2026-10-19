import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderItemDto } from './order-item.dto.js';
import {
  IntersectionType,
  OmitType,
  PartialType,
  PickType,
} from '@nestjs/mapped-types';
import { CreateOrderDto } from './create-order.dto.js';

// Keep the amount optional without letting PartialType skip validation for null.
export class UpdateOrderDto extends IntersectionType(
  PartialType(OmitType(CreateOrderDto, ['discountAmount'] as const)),
  PickType(CreateOrderDto, ['discountAmount'] as const),
) {
  @ApiPropertyOptional({
    description:
      'Descuento absoluto, máximo dos decimales, menor que el subtotal. No admite null.',
    minimum: 0,
    type: Number,
  })
  declare discountAmount?: number;

  @ApiPropertyOptional({
    description: 'Motivo del descuento; se limpia cuando el importe es cero.',
    nullable: true,
    maxLength: 250,
    type: String,
  })
  declare discountReason?: string | null;

  @ApiPropertyOptional({
    description:
      'Cliente de la misma tienda; null permite desvincularlo en una actualización.',
    nullable: true,
    format: 'uuid',
    type: String,
  })
  declare customerId?: string;

  @ApiPropertyOptional({
    description: 'Correo electrónico.',
    nullable: true,
    format: 'email',
    type: String,
  })
  declare email?: string;

  @ApiPropertyOptional({
    description: 'Teléfono en formato internacional.',
    nullable: true,
    type: String,
  })
  declare phone?: string;

  @ApiPropertyOptional({ description: 'Nota.', nullable: true, type: String })
  declare note?: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Artículos del pedido.',
    minItems: 1,
    type: () => [OrderItemDto],
  })
  declare items?: OrderItemDto[];
}
