import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiProduces,
} from '@nestjs/swagger';
import { ApiErrors } from '../common/openapi/api-response.decorator.js';

import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@ApiTags('Salud')
@ApiProduces('application/json')
@ApiErrors({ 500: 'Error interno o fallo de acceso a los datos.' })
@Controller('salud')
export class SaludController {
  constructor(private readonly prismaService: PrismaService) {}

  @ApiOperation({
    summary: 'Comprobar conexión con PostgreSQL',
    description:
      'Ejecuta SELECT 1 y devuelve el arreglo crudo de PostgreSQL. Endpoint público.',
    operationId: 'salud_salud',
  })
  @ApiResponse({
    status: 200,
    description: 'Operación completada.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        required: ['?column?'],
        properties: { '?column?': { type: 'integer', enum: [1] } },
      },
    },
  })
  @Get()
  async salud() {
    return await this.prismaService.$queryRaw`SELECT 1`;
  }
}
