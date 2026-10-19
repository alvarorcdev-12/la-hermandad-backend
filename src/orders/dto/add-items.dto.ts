import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class AddItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @ApiProperty({
    description: 'Productos que se agregan con una unidad por entrada.',
    minItems: 1,
    type: [String],
  })
  productIds: string[];
}
