import { ApiProperty } from '@nestjs/swagger';
import { Decimal } from '@prisma/client/runtime/client';

export class Customer {
  @ApiProperty({
    description: 'Identificador.',
    type: 'string',
    format: 'uuid',
  })
  id: string;
  @ApiProperty({ description: 'Nombre completo.', type: 'string' })
  displayName: string;
  @ApiProperty({ description: 'Nombres.', type: 'string' })
  firstName: string;
  @ApiProperty({ description: 'Apellidos.', nullable: true, type: 'string' })
  lastName: string | null;
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
    description:
      'Suma de los totales de todos los pedidos del cliente, incluidos los cancelados. Decimal serializado como cadena.',
    type: 'string',
    example: '125.5',
  })
  amountSpent: Decimal;
  @ApiProperty({ description: 'Cantidad de pedidos.', type: 'number' })
  numberOfOrders: number;
  @ApiProperty({
    description: 'Indica si el cliente no tiene pedidos.',
    type: 'boolean',
  })
  canDelete: boolean;
  @ApiProperty({
    description: 'Fecha de creación.',
    type: 'string',
    format: 'date-time',
  })
  createdAt: Date;
}
