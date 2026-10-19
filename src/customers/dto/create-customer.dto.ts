import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsPhoneNumber, IsString } from 'class-validator';

export class CreateCustomerDto {
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
  @IsOptional()
  @ApiPropertyOptional({ description: 'Nota.', nullable: true, type: String })
  note?: string;
}
