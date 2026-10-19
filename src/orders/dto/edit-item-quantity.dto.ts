import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';

export class EditItemQuantityDto {
  @IsNumber()
  @Min(0)
  @ApiProperty({
    description: 'Cantidad de unidades.',
    minimum: 0,
    maximum: 2147483647,
    type: 'integer',
  })
  quantity: number;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Reposición de existencias.',
    nullable: true,
    default: false,
    type: Boolean,
  })
  restock?: boolean = false;
}
