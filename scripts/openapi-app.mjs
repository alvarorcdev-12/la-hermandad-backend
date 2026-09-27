import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';

// Solo generación/verificación: nunca utiliza credenciales ni conexiones reales.
export async function createDocumentationApp(prefix = 'api') {
  process.env.JWT_SECRET = 'openapi-offline-test-secret';
  const { AppModule } = await import('../dist/src/app.module.js');
  const { PrismaService } = await import('../dist/src/prisma.service.js');
  const fixture = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue({})
    .compile();
  const app = fixture.createNestApplication();
  app.setGlobalPrefix(prefix);
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  return app;
}
