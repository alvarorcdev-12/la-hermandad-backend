import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../generated/prisma/enums.js';

export class User {
  @ApiProperty({
    description: 'Identificador.',
    type: 'string',
    format: 'uuid',
  })
  id: string;
  @ApiProperty({ description: 'Nombres.', type: 'string' })
  firstName: string;
  @ApiProperty({ description: 'Apellidos.', nullable: true, type: 'string' })
  lastName: string | null;
  @ApiProperty({
    description: 'URL del avatar.',
    nullable: true,
    type: 'string',
  })
  avatar: string | null;
  @ApiProperty({
    description: 'Correo electrónico.',
    nullable: true,
    type: 'string',
  })
  email: string;
  @ApiProperty({
    description: 'Iniciales.',
    type: 'array',
    items: { type: 'string' },
  })
  initials: string[];
  @ApiProperty({ description: 'Usuario activo.', type: 'boolean' })
  isActive: boolean;
  @ApiProperty({
    description: 'Indica si es propietario de la tienda.',
    type: 'boolean',
  })
  isShopOwner: boolean;
  @ApiProperty({ description: 'Nombre mostrado.', type: 'string' })
  name: string;
  @ApiProperty({ description: 'Teléfono.', nullable: true, type: 'string' })
  phone: string | null;
  @ApiProperty({ description: 'Rol.', enum: Role, enumName: 'Role' })
  role: Role;
  @ApiProperty({
    description: 'Fecha de creación.',
    type: 'string',
    format: 'date-time',
  })
  createdAt: Date;
}
