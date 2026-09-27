import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LoginUserDto {
  @IsString()
  @ApiProperty({
    description: 'Correo electrónico',
    example: 'alvaro@example.com',
    type: 'string',
  })
  email: string;

  @IsString()
  @ApiProperty({
    description: 'Contraseña de acceso',
    example: 'Ejemplo123!',
    type: 'string',
    format: 'password',
    writeOnly: true,
  })
  password: string;
}
