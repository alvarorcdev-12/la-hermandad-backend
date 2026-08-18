import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class AddItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  productIds: string[];
}
