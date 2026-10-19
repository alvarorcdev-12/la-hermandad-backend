import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function createOpenApiDocument(app: INestApplication) {
  const config = app.get(ConfigService);
  const builder = new DocumentBuilder()
    .setTitle(config.get<string>('appName') ?? 'La Hermandad — Backend')
    .setDescription(
      'API de La Hermandad para administración del negocio y punto de venta móvil. Los recursos protegidos usan la tienda del usuario autenticado. Los importes Decimal se devuelven como cadenas. Los cuerpos no admiten propiedades ajenas al DTO. Los errores pueden contener un mensaje o una lista de validaciones. No existe versionado de rutas.',
    )
    .setVersion('0.0.1')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'JWT emitido por autenticación; enviar en Authorization: Bearer <JWT>.',
      },
      'bearer',
    );
  const serverUrl = config.get<string>('swagger.serverUrl');
  builder.addServer(
    serverUrl || '/',
    serverUrl
      ? 'Servidor configurado por el entorno; sin prefijo API.'
      : 'Mismo origen que la documentación.',
  );
  for (const [name, description] of Object.entries({
    Autenticación: 'Inicio y comprobación de sesión.',
    Usuarios: 'Personal, perfiles y acceso POS.',
    Categorías: 'Organización del catálogo.',
    Productos: 'Catálogo y existencias.',
    Clientes: 'Datos de clientes.',
    Pedidos: 'Pedidos, artículos, descuentos, pagos y estadísticas.',
    Salud: 'Comprobación de acceso a la base de datos.',
    'Datos de desarrollo': 'Carga destructiva de datos de ejemplo.',
  }))
    builder.addTag(name, description);
  const document = SwaggerModule.createDocument(app, builder.build(), {
    autoTagControllers: false,
    operationIdFactory: (controller, method) =>
      `${controller.replace(/Controller$/, '').toLowerCase()}_${method}`,
  });
  // Esta ruta siempre lanza una excepción; Swagger infiere un 201 por ser POST.
  for (const path of Object.values(document.paths)) {
    if (path.post?.operationId === 'orders_open')
      delete path.post.responses['201'];
  }
  return document;
}

export function setupSwagger(app: INestApplication): void {
  const config = app.get(ConfigService);
  if (!config.get<boolean>('swagger.enabled')) return;
  SwaggerModule.setup('docs', app, () => createOpenApiDocument(app), {
    useGlobalPrefix: true,
    jsonDocumentUrl: 'docs-json',
    raw: ['json'],
    swaggerOptions: { persistAuthorization: false, supportedSubmitMethods: [] },
    customSiteTitle: 'La Hermandad — Documentación API',
  });
}
