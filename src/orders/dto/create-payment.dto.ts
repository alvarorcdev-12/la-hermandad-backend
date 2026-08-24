import { IsNumber, Min, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from 'src/generated/prisma/enums';

export class CreatePaymentDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
