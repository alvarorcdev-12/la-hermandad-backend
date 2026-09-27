import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class OrderStatsDto {
  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({
    description:
      'Inicio inclusivo por fecha de creación, normalizado al inicio del día del servidor',
    example: '2026-09-01',
    type: 'string',
  })
  startDate?: string;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({
    description:
      'Fin inclusivo por fecha de creación, normalizado al final del día del servidor',
    example: '2026-09-27',
    type: 'string',
  })
  endDate?: string;
}
