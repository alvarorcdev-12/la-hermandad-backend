import { IsNumber, IsUUID, Min } from 'class-validator';

export class OrderItemDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}
