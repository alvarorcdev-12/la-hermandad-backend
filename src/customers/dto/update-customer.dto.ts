import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomerDto } from './create-customer.dto.js';

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
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

  @ApiPropertyOptional({ description: 'Nota.', nullable: true, type: String })
  declare note?: string;
}
