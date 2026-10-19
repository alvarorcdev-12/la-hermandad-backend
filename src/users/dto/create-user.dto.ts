import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
  Matches,
  ValidateIf,
} from 'class-validator';
import {
  POS_PIN_MESSAGE,
  POS_PIN_PATTERN,
} from '../pos-pin/pos-pin.validation.js';
import { Role } from '../../generated/prisma/enums.js';

export class CreateUserDto {
  @IsString()
  @ApiProperty({ description: 'Nombres.', type: String })
  firstName: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Apellidos.',
    nullable: true,
    type: String,
  })
  lastName?: string;

  @IsEmail()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Correo electrónico.',
    nullable: true,
    format: 'email',
    type: String,
  })
  email?: string;

  @IsPhoneNumber()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Teléfono en formato internacional.',
    nullable: true,
    type: String,
  })
  phone?: string;

  @IsString()
  @MinLength(6)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Contraseña; no se devuelve en las respuestas.',
    nullable: true,
    writeOnly: true,
    format: 'password',
    minLength: 6,
    type: String,
  })
  password?: string;

  @IsEnum(Role)
  @ApiProperty({
    description: 'Rol del usuario.',
    enum: Role,
    enumName: 'Role',
  })
  role: Role;

  // POS
  @ValidateIf(
    (user: CreateUserDto) =>
      user.role === Role.CASHIER || user.posPin !== undefined,
  )
  @Matches(POS_PIN_PATTERN, { message: POS_PIN_MESSAGE })
  @ApiPropertyOptional({
    description:
      'PIN POS de seis dígitos; no se admiten patrones triviales. Obligatorio al crear un CASHIER.',
    writeOnly: true,
    format: 'password',
    pattern: '^(?!([0-9])\\1{5}$)(?!123456$|654321$|000111$)[0-9]{6}$',
    minLength: 6,
    maxLength: 6,
    type: String,
  })
  posPin?: string;
}
