import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsUUID, Min } from 'class-validator';

export class OrderItemDto {
  @IsUUID()
  @ApiProperty({
    description: 'Producto activo de la misma tienda.',
    format: 'uuid',
    type: String,
  })
  productId: string;

  @IsNumber()
  @Min(1)
  @ApiProperty({
    description: 'Cantidad de unidades.',
    minimum: 1,
    maximum: 2147483647,
    type: 'integer',
  })
  quantity: number;
}
