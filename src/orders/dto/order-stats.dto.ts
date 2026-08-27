import { IsDateString, IsOptional } from 'class-validator';

export class OrderStatsDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
