import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';

export class EditItemQuantityDto {
  @IsNumber()
  @Min(0)
  @ApiProperty({
    description: 'Cantidad de unidades; enviar un entero',
    example: 1,
    type: 'number',
    minimum: 0.0,
  })
  quantity: number;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Reponer inventario al reducir la cantidad',
    example: false,
    type: 'boolean',
    default: false,
  })
  restock?: boolean = false;
}
