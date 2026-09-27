import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ref } from './schemas.js';

export function ApiEndpoint(
  summary: string,
  description: string,
  response: string,
  status = 200,
  params: string[] = [],
  errors: number[] = [],
) {
  const descriptions: Record<number, string> = {
    400: 'Datos inválidos, propiedades no permitidas o regla de negocio incumplida. En usuarios, también se usa cuando el usuario no existe.',
    404: 'Recurso no encontrado en la tienda del usuario o registro relacionado inexistente.',
    409: 'Conflicto de unicidad: el valor ya existe.',
    500: 'Error interno o de base de datos. Algunos errores Prisma no interceptados se devuelven con este estado.',
  };
  return applyDecorators(
    ApiOperation({ summary, description }),
    ApiResponse({
      status,
      description:
        status === 201
          ? 'Operación completada (POST devuelve 201).'
          : 'Operación completada.',
      schema: ref(response),
    }),
    ...params.map((name) =>
      ApiParam({
        name,
        description:
          name === 'itemId'
            ? 'UUID del artículo dentro del pedido.'
            : 'UUID del recurso en la tienda del usuario.',
        format: 'uuid',
      }),
    ),
    ...[...new Set([400, 500, ...errors])].map((code) =>
      ApiResponse({
        status: code,
        description: descriptions[code],
        schema: ref('Error'),
      }),
    ),
  );
}
