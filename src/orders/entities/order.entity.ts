import { ApiProperty } from '@nestjs/swagger';
import type { Customer } from '../../generated/prisma/client.js';
import { Decimal } from '@prisma/client/runtime/client';
import { FinancialStatus, OrderStatus } from '../../generated/prisma/enums.js';

import {
  CustomerRecordResponseDto,
  OrderItemResponseDto,
} from '../../common/openapi/response.dto.js';

export class Order {
  @ApiProperty({
    description: 'Identificador.',
    type: 'string',
    format: 'uuid',
  })
  id: string;
  @ApiProperty({
    description:
      'Número comercial convertido de BigInt a number por el mapper.',
    type: 'number',
  })
  number: number;
  @ApiProperty({ description: 'Nombre mostrado.', type: 'string' })
  name: string;
  @ApiProperty({ description: 'Suma de cantidades.', type: 'number' })
  itemCount: number;
  @ApiProperty({
    description: 'Subtotal. Decimal serializado como cadena.',
    type: 'string',
    example: '125.5',
  })
  subtotalPrice: Decimal;
  @ApiProperty({
    description: 'Descuento absoluto. Decimal serializado como cadena.',
    type: 'string',
    example: '125.5',
  })
  discountAmount: Decimal;
  @ApiProperty({
    description: 'Motivo del descuento.',
    nullable: true,
    type: 'string',
  })
  discountReason: string | null;
  @ApiProperty({
    description: 'Total. Decimal serializado como cadena.',
    type: 'string',
    example: '125.5',
  })
  totalPrice: Decimal;
  @ApiProperty({
    description: 'Correo electrónico.',
    nullable: true,
    type: 'string',
  })
  email: string | null;
  @ApiProperty({ description: 'Teléfono.', nullable: true, type: 'string' })
  phone: string | null;
  @ApiProperty({ description: 'Nota.', nullable: true, type: 'string' })
  note: string | null;
  @ApiProperty({
    description: 'Cliente asociado con sus campos persistidos.',
    nullable: true,
    type: () => CustomerRecordResponseDto,
  })
  customer: Customer | null;
  @ApiProperty({
    description: 'Estado financiero.',
    enum: FinancialStatus,
    enumName: 'FinancialStatus',
  })
  financialStatus: FinancialStatus;
  @ApiProperty({
    description: 'Estado.',
    enum: OrderStatus,
    enumName: 'OrderStatus',
  })
  status: OrderStatus;
  @ApiProperty({
    description: 'Fecha de cancelación.',
    nullable: true,
    type: 'string',
    format: 'date-time',
  })
  cancelledAt: Date | null;
  @ApiProperty({
    description: 'Motivo de cancelación.',
    nullable: true,
    type: 'string',
  })
  cancelReason: string | null;
  @ApiProperty({
    description: 'Fecha de cierre.',
    nullable: true,
    type: 'string',
    format: 'date-time',
  })
  closedAt: Date | null;
  @ApiProperty({
    description: 'Fecha de pago completo.',
    nullable: true,
    type: 'string',
    format: 'date-time',
  })
  paidAt: Date | null;
  @ApiProperty({
    description: 'Fecha de creación.',
    type: 'string',
    format: 'date-time',
  })
  createdAt: Date;
  @ApiProperty({
    description:
      'Fecha de actualización; se conserva la clave del contrato actual.',
    type: 'string',
    format: 'date-time',
  })
  updateAt: Date;
  @ApiProperty({
    description: 'Artículos con cantidad mayor que cero.',
    type: () => [OrderItemResponseDto],
  })
  items: {
    id: string;
    productId: string;
    title: string;
    quantity: number;
    unitPrice: Decimal;
    totalPrice: Decimal;
    sku: string | null;
  }[];
}
