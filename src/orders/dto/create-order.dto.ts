import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderItemDto } from './order-item.dto.js';

export class CreateOrderDto {
  @IsUUID()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Identificador UUID del recurso',
    example: '123e4567-e89b-42d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  customerId?: string;

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

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @ApiProperty({
    description: 'Artículos del pedido',
    minItems: 1,
    type: () => [OrderItemDto],
  })
  items: OrderItemDto[];
}
