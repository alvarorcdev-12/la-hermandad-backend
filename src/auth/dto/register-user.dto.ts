import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, MinLength, IsOptional } from 'class-validator';

export class RegisterUserDto {
  @IsString()
  @MinLength(3)
  @ApiProperty({
    description: 'Nombre comercial de la tienda',
    example: 'La Hermandad',
    type: 'string',
    minLength: 3,
  })
  storeName: string;

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
}
