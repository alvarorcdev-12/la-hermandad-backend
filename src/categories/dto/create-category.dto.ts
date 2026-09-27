import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(3)
  @ApiProperty({
    description: 'Nombre de la categoría',
    example: 'Bebidas',
    type: 'string',
    minLength: 3,
  })
  name: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Descripción',
    example: 'Descripción de ejemplo',
    type: 'string',
  })
  description?: string;
}
