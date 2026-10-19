import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiProduces,
} from '@nestjs/swagger';
import { ApiErrors } from '../common/openapi/api-response.decorator.js';

import { Controller, Get } from '@nestjs/common';
import { SeedService } from './seed.service.js';

@ApiTags('Datos de desarrollo')
@ApiProduces('application/json')
@ApiErrors({ 500: 'Error interno o fallo de acceso a los datos.' })
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @ApiOperation({
    summary: 'Eliminar datos y cargar ejemplos',
    description:
      'PELIGRO: endpoint público que intenta eliminar todas las tiendas y sus datos relacionados y luego carga datos de ejemplo. No tiene restricción por entorno. Puede fallar por relaciones restrictivas. No ejecutar sobre datos que se deban conservar.',
    operationId: 'seed_executeSeed',
  })
  @ApiResponse({
    status: 200,
    description: 'Operación completada.',
    schema: {
      type: 'object',
      required: ['ok', 'message'],
      properties: {
        ok: { type: 'boolean', enum: [true] },
        message: {
          type: 'string',
          description: 'Confirmación de la carga de datos.',
        },
      },
    },
  })
  @Get()
  executeSeed() {
    return this.seedService.runSeed();
  }
}
