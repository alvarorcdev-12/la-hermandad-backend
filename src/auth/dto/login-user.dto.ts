import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LoginUserDto {
  @IsString()
  @ApiProperty({ description: 'Correo electrónico.', type: String })
  email: string;

  @IsString()
  @ApiProperty({
    description: 'Contraseña; no se devuelve en las respuestas.',
    writeOnly: true,
    format: 'password',
    type: String,
  })
  password: string;
}
