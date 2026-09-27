import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @ApiProperty({
    description: 'Contraseña actual',
    example: 'Ejemplo123!',
    type: 'string',
    format: 'password',
    writeOnly: true,
  })
  currentPassword: string;

  @IsString()
  @MinLength(6)
  @ApiProperty({
    description: 'Nueva contraseña, distinta de la actual',
    example: 'Nueva123!',
    type: 'string',
    format: 'password',
    writeOnly: true,
    minLength: 6,
  })
  newPassword: string;
}
