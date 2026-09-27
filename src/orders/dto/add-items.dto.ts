import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class AddItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  @ApiProperty({
    description: 'Productos a agregar, cada uno con cantidad 1',
    example: ['123e4567-e89b-42d3-a456-426614174000'],
    format: 'uuid',
    minItems: 1,
    type: [String],
  })
  productIds: string[];
}
