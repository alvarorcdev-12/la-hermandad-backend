import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from '../../generated/prisma/enums.js';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  @ApiProperty({
    description: 'Nombre del usuario o cliente',
    example: 'Álvaro',
    type: 'string',
    minLength: 3,
  })
  firstName: string;

  @IsString()
  @MinLength(3)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Apellidos',
    example: 'Pérez',
    type: 'string',
    minLength: 3,
  })
  lastName?: string;

  @IsEmail()
  @ApiProperty({
    description: 'Correo electrónico',
    example: 'alvaro@example.com',
    type: 'string',
    format: 'email',
  })
  email: string;

  @IsPhoneNumber()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Teléfono en formato internacional',
    example: '+59171234567',
    type: 'string',
  })
  phone?: string;

  @IsString()
  @MinLength(6)
  @ApiProperty({
    description: 'Contraseña de acceso',
    example: 'Ejemplo123!',
    type: 'string',
    format: 'password',
    writeOnly: true,
    minLength: 6,
  })
  password: string;

  @IsEnum(Role)
  @ApiProperty({
    description: 'Estado o rol permitido',
    enum: Role,
    enumName: 'Role',
  })
  role: Role;
}
