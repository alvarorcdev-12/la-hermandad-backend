import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';

export class EditItemQuantityDto {
  @IsNumber()
  @Min(1)
  quantity: number;

  @IsBoolean()
  @IsOptional()
  restock?: boolean = false;
}
