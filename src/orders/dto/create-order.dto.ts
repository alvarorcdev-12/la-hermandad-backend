import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsNumber,
  Min,
  MaxLength,
  ValidateIf,
  IsPhoneNumber,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderItemDto } from './order-item.dto.js';

export class CreateOrderDto {
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message:
        'El descuento debe ser un número finito con máximo dos decimales.',
    },
  )
  @Min(0, { message: 'El descuento no puede ser negativo.' })
  @ApiPropertyOptional({
    description:
      'Descuento absoluto, máximo dos decimales, menor que el subtotal. No admite null.',
    minimum: 0,
    type: Number,
  })
  discountAmount?: number;

  @IsOptional()
  @IsString({ message: 'El motivo del descuento debe ser un texto.' })
  @MaxLength(250, {
    message: 'El motivo del descuento no puede superar los 250 caracteres.',
  })
  @ApiPropertyOptional({
    description: 'Motivo del descuento; se limpia cuando el importe es cero.',
    nullable: true,
    maxLength: 250,
    type: String,
  })
  discountReason?: string | null;

  @IsUUID()
  @IsOptional()
  @ApiPropertyOptional({
    description:
      'Cliente de la misma tienda; null permite desvincularlo en una actualización.',
    nullable: true,
    format: 'uuid',
    type: String,
  })
  customerId?: string;

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

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @ApiProperty({
    description: 'Artículos del pedido.',
    minItems: 1,
    type: () => [OrderItemDto],
  })
  items: OrderItemDto[];
}
