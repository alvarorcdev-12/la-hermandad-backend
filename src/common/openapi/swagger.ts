import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { responseSchemas } from './schemas.js';

export function createOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('La Hermandad — API POS')
    .setVersion('1.0.0')
    .setDescription(
      'API del punto de venta: autenticación, usuarios, categorías, productos, clientes y pedidos con pagos. Las rutas protegidas obtienen la tienda desde el usuario autenticado. Use login o register y pegue el token en Authorize. Los JWT duran 24 horas. Los cuerpos rechazan propiedades desconocidas. Los importes de entrada son números y los Decimal de salida son cadenas. Todos los POST devuelven 201; PATCH y DELETE devuelven 200 con cuerpo. Los permisos se indican mediante x-roles en cada operación.',
    )
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description:
        'Pegue únicamente el token obtenido en auth/login o auth/register.',
    })
    .addTag(
      'auth',
      'Registro de tienda y propietario, inicio de sesión y renovación del token.',
    )
    .addTag(
      'users',
      'Perfil, contraseña y administración del personal de la tienda.',
    )
    .addTag('categories', 'Clasificación del catálogo.')
    .addTag('products', 'Catálogo, precios y existencias.')
    .addTag('customers', 'Clientes e información agregada de sus pedidos.')
    .addTag('orders', 'Pedidos, artículos, estados, estadísticas y pagos.')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  document.components ??= {};
  document.components.schemas = {
    ...document.components.schemas,
    ...responseSchemas,
  };
  return document;
}

export function setupSwagger(app: INestApplication, apiPrefix: string) {
  const base = apiPrefix.replace(/^\/+|\/+$/g, '');
  const path = [base, 'docs'].filter(Boolean).join('/');
  SwaggerModule.setup(path, app, () => createOpenApiDocument(app), {
    jsonDocumentUrl: `${path}/openapi.json`,
    yamlDocumentUrl: `${path}/openapi.yaml`,
    customSiteTitle: 'La Hermandad · API',
    swaggerOptions: {
      tagsSorter: 'alpha',
      docExpansion: 'none',
      displayRequestDuration: true,
    },
  });
}
