import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../generated/prisma/enums.js';
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto.js';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({
    nullable: true,
    description: 'Nombres.',
    type: String,
  })
  declare firstName?: string;

  @ApiPropertyOptional({
    description: 'Apellidos.',
    nullable: true,
    type: String,
  })
  declare lastName?: string;

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

  @ApiPropertyOptional({
    description: 'Contraseña; no se devuelve en las respuestas.',
    nullable: true,
    writeOnly: true,
    format: 'password',
    minLength: 6,
    type: String,
  })
  declare password?: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Rol del usuario.',
    enum: Role,
    enumName: 'Role',
  })
  declare role?: Role;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'PIN POS de seis dígitos; no se admiten patrones triviales. Obligatorio al crear un CASHIER.',
    writeOnly: true,
    format: 'password',
    pattern: '^(?!([0-9])\\1{5}$)(?!123456$|654321$|000111$)[0-9]{6}$',
    minLength: 6,
    maxLength: 6,
    type: String,
  })
  declare posPin?: string;
}
