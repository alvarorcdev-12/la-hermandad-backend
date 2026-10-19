import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, Min, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '../../generated/prisma/enums.js';

export class CreatePaymentDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @ApiProperty({
    description:
      'Importe del pago, máximo dos decimales y sin exceder el saldo.',
    minimum: 0.01,
    maximum: 9999999999.99,
    type: Number,
  })
  amount: number;

  @IsEnum(PaymentMethod)
  @ApiProperty({
    description: 'Medio de pago.',
    enum: PaymentMethod,
    enumName: 'PaymentMethod',
  })
  method: PaymentMethod;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Referencia del pago.',
    nullable: true,
    type: String,
  })
  reference?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Nota.', nullable: true, type: String })
  note?: string;
}
