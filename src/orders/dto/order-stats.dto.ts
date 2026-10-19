import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class OrderStatsDto {
  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({
    description:
      'Inicio inclusivo del intervalo de creación; fecha ISO 8601 o fecha y hora.',
    nullable: true,
    type: String,
  })
  startDate?: string;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({
    description:
      'Fin inclusivo del intervalo de creación; fecha ISO 8601 o fecha y hora.',
    nullable: true,
    type: String,
  })
  endDate?: string;
}
