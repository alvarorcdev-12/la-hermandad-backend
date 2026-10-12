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
  discountAmount?: number;

  @IsOptional()
  @IsString({ message: 'El motivo del descuento debe ser un texto.' })
  @MaxLength(250, {
    message: 'El motivo del descuento no puede superar los 250 caracteres.',
  })
  discountReason?: string | null;

  @IsUUID()
  @IsOptional()
  customerId?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsPhoneNumber()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
