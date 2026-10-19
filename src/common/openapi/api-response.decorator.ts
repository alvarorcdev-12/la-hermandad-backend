import { applyDecorators, type Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger';

export const errorSchema: SchemaObject = {
  type: 'object',
  required: ['statusCode', 'message'],
  properties: {
    statusCode: { type: 'integer', description: 'Código HTTP.' },
    message: {
      description: 'Detalle del error o lista de errores de validación.',
      oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    },
    error: {
      type: 'string',
      description: 'Nombre del error HTTP; puede omitirse.',
    },
  },
};

export function ApiErrors(errors: Partial<Record<number, string>>) {
  return applyDecorators(
    ...Object.entries(errors).map(([status, description]) =>
      ApiResponse({ status: Number(status), description, schema: errorSchema }),
    ),
  );
}

export function ApiPage(model: Type) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status: 200,
      description: 'Página de resultados de la tienda autenticada.',
      schema: {
        type: 'object',
        required: ['meta', 'results'],
        properties: {
          meta: {
            type: 'object',
            required: [
              'totalItems',
              'currentPage',
              'pageSize',
              'totalPages',
              'hasNextPage',
              'hasPreviousPage',
            ],
            properties: {
              totalItems: {
                type: 'integer',
                description: 'Total de coincidencias.',
              },
              currentPage: {
                type: 'number',
                description: 'Página solicitada.',
              },
              pageSize: { type: 'number', description: 'Tamaño solicitado.' },
              totalPages: {
                type: 'integer',
                description: 'Total de páginas; cero si no hay resultados.',
              },
              hasNextPage: {
                type: 'boolean',
                description: 'Existe una página siguiente.',
              },
              hasPreviousPage: {
                type: 'boolean',
                description: 'La página solicitada es mayor que uno.',
              },
            },
          },
          results: { type: 'array', items: { $ref: getSchemaPath(model) } },
        },
      },
    }),
  );
}
