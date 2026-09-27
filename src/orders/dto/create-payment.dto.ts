import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, Min, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '../../generated/prisma/enums.js';

export class CreatePaymentDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @ApiProperty({
    description: 'Importe del pago, mínimo 0.01 y máximo dos decimales',
    example: 25.5,
    type: 'number',
    minimum: 0.01,
  })
  amount: number;

  @IsEnum(PaymentMethod)
  @ApiProperty({
    description: 'Estado o rol permitido',
    enum: PaymentMethod,
    enumName: 'PaymentMethod',
  })
  method: PaymentMethod;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Referencia del pago',
    example: 'REC-001',
    type: 'string',
  })
  reference?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Nota interna',
    example: 'Atender por la tarde',
    type: 'string',
  })
  note?: string;
}
