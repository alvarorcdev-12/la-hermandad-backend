import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CancelOrderDto {
  @IsString()
  @ApiProperty({
    description:
      'Motivo de cancelación; no puede quedar vacío tras quitar espacios.',
    type: String,
  })
  reason: string;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    description:
      'Aceptado pero ignorado: cancelar siempre repone el inventario controlado.',
    nullable: true,
    default: true,
    type: Boolean,
  })
  restock?: boolean = true;

  // staffNote?: string;
}
