import type { Decimal } from '@prisma/client/runtime/client';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '../../generated/prisma/enums.js';

export class ProductCategoryResponseDto {
  @ApiProperty({ description: 'Identificador de categoría.', format: 'uuid' })
  id: string;
  @ApiProperty({ description: 'Nombre de categoría.' })
  name: string;
}

export class CustomerRecordResponseDto {
  @ApiProperty({ description: 'Identificador del cliente.', format: 'uuid' })
  id: string;
  @ApiProperty({ description: 'Tienda del cliente.', format: 'uuid' })
  storeId: string;
  @ApiProperty({ description: 'Nombres.' })
  firstName: string;
  @ApiProperty({ description: 'Apellidos.', type: String, nullable: true })
  lastName: string | null;
  @ApiProperty({
    description: 'Correo electrónico.',
    type: String,
    nullable: true,
  })
  email: string | null;
  @ApiProperty({ description: 'Teléfono.', type: String, nullable: true })
  phone: string | null;
  @ApiProperty({ description: 'Nota.', type: String, nullable: true })
  note: string | null;
  @ApiProperty({
    description: 'Fecha de creación.',
    type: String,
    format: 'date-time',
  })
  createdAt: Date;
  @ApiProperty({
    description: 'Fecha de actualización.',
    type: String,
    format: 'date-time',
  })
  updatedAt: Date;
}

export class OrderItemResponseDto {
  @ApiProperty({ description: 'Identificador del artículo.', format: 'uuid' })
  id: string;
  @ApiProperty({ description: 'Identificador del producto.', format: 'uuid' })
  productId: string;
  @ApiProperty({ description: 'Título conservado al agregar el producto.' })
  title: string;
  @ApiProperty({ description: 'Cantidad.', type: 'integer' })
  quantity: number;
  @ApiProperty({
    description: 'Precio unitario histórico como cadena Decimal.',
    type: String,
  })
  unitPrice: Decimal;
  @ApiProperty({
    description: 'Total del artículo como cadena Decimal.',
    type: String,
  })
  totalPrice: Decimal;
  @ApiProperty({ description: 'SKU histórico.', type: String, nullable: true })
  sku: string | null;
}

export class PaymentResponseDto {
  @ApiProperty({
    description: 'Importe registrado como cadena Decimal.',
    example: '25.5',
  })
  amount: string;
  @ApiProperty({
    description: 'Medio del pago.',
    enum: PaymentMethod,
    enumName: 'PaymentMethod',
  })
  method: PaymentMethod;
  @ApiProperty({
    description: 'Saldo pendiente como cadena Decimal.',
    example: '0',
  })
  remainingBalance: string;
}

export class OrderStatsResponseDto {
  @ApiProperty({
    description: 'Pedidos no cancelados del intervalo.',
    type: 'integer',
  })
  orders: number;
  @ApiProperty({
    description:
      'Suma de totales de pedidos no cancelados, no de pagos cobrados. Cadena Decimal.',
  })
  sales: string;
  @ApiProperty({
    description: 'Unidades en pedidos no cancelados.',
    type: 'integer',
  })
  items: number;
  @ApiProperty({ description: 'Pedidos cerrados.', type: 'integer' })
  closedOrders: number;
  @ApiProperty({ description: 'Pedidos cancelados.', type: 'integer' })
  cancelledOrders: number;
}

export class PinResponseDto {
  @ApiProperty({
    description: 'PIN POS. Dato sensible; no almacenar en caché.',
    pattern: '^[0-9]{6}$',
  })
  pin: string;
}
