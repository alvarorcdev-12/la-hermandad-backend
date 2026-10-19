import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryDto } from './create-category.dto.js';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @ApiPropertyOptional({ nullable: true, description: 'Nombre.', type: String })
  declare name?: string;

  @ApiPropertyOptional({
    description: 'Descripción.',
    nullable: true,
    type: String,
  })
  declare description?: string;
}
