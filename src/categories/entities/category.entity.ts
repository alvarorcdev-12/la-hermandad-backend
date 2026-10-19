import { ApiProperty } from '@nestjs/swagger';
export class Category {
  @ApiProperty({
    description: 'Identificador.',
    type: 'string',
    format: 'uuid',
  })
  id: string;
  @ApiProperty({ description: 'Nombre mostrado.', type: 'string' })
  name: string;
  @ApiProperty({ description: 'Descripción.', nullable: true, type: 'string' })
  description: string | null;
  @ApiProperty({
    description: 'Fecha de creación.',
    type: 'string',
    format: 'date-time',
  })
  createdAt: Date;
  @ApiProperty({
    description: 'Fecha de actualización.',
    type: 'string',
    format: 'date-time',
  })
  updatedAt: Date;
}
