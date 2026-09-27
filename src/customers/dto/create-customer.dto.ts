import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateCustomerDto {
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
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Correo electrónico',
    example: 'alvaro@example.com',
    type: 'string',
    format: 'email',
  })
  email?: string;

  @IsPhoneNumber()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Teléfono en formato internacional',
    example: '+59171234567',
    type: 'string',
  })
  phone?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Nota interna',
    example: 'Atender por la tarde',
    type: 'string',
  })
  note?: string;
}
