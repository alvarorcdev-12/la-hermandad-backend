import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CancelOrderDto {
  @IsString()
  reason: string;

  @IsBoolean()
  @IsOptional()
  restock?: boolean = true;

  // staffNote?: string;
}
