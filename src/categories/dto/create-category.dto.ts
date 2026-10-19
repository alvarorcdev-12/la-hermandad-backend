import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @ApiProperty({ description: 'Nombre.', type: String })
  name: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Descripción.',
    nullable: true,
    type: String,
  })
  description?: string;
}
