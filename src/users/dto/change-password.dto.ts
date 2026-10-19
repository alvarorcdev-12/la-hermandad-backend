import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @ApiProperty({
    description: 'Contraseña actual.',
    writeOnly: true,
    format: 'password',
    type: String,
  })
  currentPassword: string;

  @IsString()
  @MinLength(6)
  @ApiProperty({
    description: 'Nueva contraseña, distinta de la actual.',
    writeOnly: true,
    format: 'password',
    minLength: 6,
    type: String,
  })
  newPassword: string;
}
