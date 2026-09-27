import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsUUID, Min } from 'class-validator';

export class OrderItemDto {
  @IsUUID()
  @ApiProperty({
    description: 'Identificador UUID del recurso',
    example: '123e4567-e89b-42d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  productId: string;

  @IsNumber()
  @Min(1)
  @ApiProperty({
    description: 'Cantidad de unidades; enviar un entero',
    example: 1,
    type: 'number',
    minimum: 1.0,
  })
  quantity: number;
}
