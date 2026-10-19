import 'reflect-metadata';
import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import type {
  OpenAPIObject,
  OperationObject,
  SchemaObject,
} from '@nestjs/swagger';
// Se verifica el código compilado por Nest para conservar los metadatos de decoradores.
import { AppModule } from '../dist/app.module.js';
import { PrismaService } from '../dist/prisma.service.js';
import { createOpenApiDocument, setupSwagger } from '../dist/config/swagger.js';
import configuration from '../dist/config/configuration.js';

const config = new ConfigService({
  appName: 'La Hermandad — Backend',
  jwt: { secret: randomBytes(32).toString('hex') },
  swagger: { enabled: true },
});
const database = { user: { findUnique: vi.fn() } };
let app: INestApplication;
let document: OpenAPIObject;
let token: string;

beforeAll(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ConfigService)
    .useValue(config)
    .overrideProvider(PrismaService)
    .useValue(database)
    .compile();
  app = module.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  setupSwagger(app);
  await app.init();
  document = createOpenApiDocument(app);
  token = module.get(JwtService).sign({ id: 'test-user' });
});
afterAll(async () => {
  await app?.close();
  vi.unstubAllEnvs();
});

const operations = () =>
  Object.values(document.paths).flatMap((path) =>
    ['get', 'post', 'patch', 'delete'].flatMap((method) => {
      const operation = path[method as 'get'];
      return operation ? [operation] : [];
    }),
  );
const schema = (name: string) =>
  document.components?.schemas?.[name] as SchemaObject;
const property = (name: string, field: string) =>
  schema(name).properties?.[field] as SchemaObject;

describe('OpenAPI contract', () => {
  it('documents all 43 operations with unique identifiers and the real prefix', () => {
    expect(operations()).toHaveLength(43);
    expect(
      new Set(operations().map((operation) => operation.operationId)).size,
    ).toBe(43);
    expect(
      Object.keys(document.paths).every((path) => path.startsWith('/api/')),
    ).toBe(true);
    for (const operation of operations()) {
      expect(operation.summary).toBeTruthy();
      expect(operation.description).toBeTruthy();
      expect(operation.tags).toHaveLength(1);
      expect(operation.responses['500']).toBeDefined();
    }
  });
  it('documents bearer security and role errors only for protected operations', () => {
    const publicIds = [
      'auth_login',
      'auth_loginPin',
      'salud_salud',
      'seed_executeSeed',
    ];
    for (const operation of operations()) {
      if (publicIds.includes(operation.operationId ?? ''))
        expect(operation.security ?? []).toEqual([]);
      else {
        expect(operation.security).toContainEqual({ bearer: [] });
        expect(operation.responses['401']).toBeDefined();
        expect(operation['x-roles' as keyof OperationObject]).toBeDefined();
      }
    }
  });
  it('keeps actual success codes and excludes the impossible reopen success', () => {
    expect(
      document.paths['/api/auth/login'].post?.responses['201'],
    ).toBeDefined();
    expect(
      document.paths['/api/auth/login-pin'].post?.responses['200'],
    ).toBeDefined();
    expect(
      document.paths['/api/orders/{id}/payment'].post?.responses['201'],
    ).toBeDefined();
    expect(
      Object.keys(
        document.paths['/api/orders/{id}/open'].post?.responses ?? {},
      ).some((code) => code.startsWith('2')),
    ).toBe(false);
  });
  it('documents decimals, nullable fields, nested items and mapped updates', () => {
    expect(property('Order', 'totalPrice').type).toBe('string');
    expect(property('Order', 'updateAt').format).toBe('date-time');
    expect(property('User', 'email').nullable).toBe(true);
    expect(property('Order', 'items').items).toEqual({
      $ref: '#/components/schemas/OrderItemResponseDto',
    });
    expect(schema('CreateOrderDto').required).toEqual(['items']);
    expect(schema('UpdateOrderDto').required ?? []).toEqual([]);
    expect(
      Object.keys(schema('UpdateProductDto').properties ?? {}),
    ).toHaveLength(10);
    expect(property('UpdateOrderDto', 'discountAmount').nullable ?? false).toBe(
      false,
    );
    expect(property('UpdateOrderDto', 'discountReason').nullable).toBe(true);
  });
  it('documents inherited pagination and path parameters', () => {
    const parameters = document.paths['/api/orders'].get?.parameters ?? [];
    expect(
      parameters.map((param) => ('name' in param ? param.name : '')),
    ).toEqual(
      expect.arrayContaining([
        'page',
        'limit',
        'q',
        'sort',
        'direction',
        'status',
        'startDate',
        'endDate',
      ]),
    );
    for (const [path, item] of Object.entries(document.paths)) {
      for (const operation of Object.values(item)) {
        if (typeof operation !== 'object' || !('operationId' in operation))
          continue;
        for (const [, name] of path.matchAll(/\{(\w+)\}/g))
          expect(operation.parameters).toContainEqual(
            expect.objectContaining({ name, in: 'path', required: true }),
          );
      }
    }
  });
  it('resolves every component reference without exposing credential storage', () => {
    const serialized = JSON.stringify(document);
    for (const [, name] of serialized.matchAll(
      /#\/components\/schemas\/([^" ]+)/g,
    ))
      expect(document.components?.schemas?.[name]).toBeDefined();
    expect(serialized).not.toContain('posPinEncrypted');
    expect(serialized).not.toContain('posPinLookup');
    for (const name of ['User', 'StaffUser'])
      expect(schema(name).properties).not.toHaveProperty('password');
    expect(property('LoginUserDto', 'password').writeOnly).toBe(true);
  });
  it('serves the UI and JSON under the configured prefix without retaining authorization', async () => {
    await request(app.getHttpServer()).get('/api/docs').expect(200);
    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);
    expect(response.body.paths).toHaveProperty('/api/auth/login');
    const init = await request(app.getHttpServer())
      .get('/api/docs/swagger-ui-init.js')
      .expect(200);
    expect(init.text).toContain('"persistAuthorization": false');
    expect(init.text).toContain('"supportedSubmitMethods": []');
  });
  it('disables documentation by default and always in production', () => {
    vi.stubEnv('SWAGGER_ENABLED', '');
    expect(configuration().swagger.enabled).toBe(false);
    vi.stubEnv('SWAGGER_ENABLED', 'true');
    vi.stubEnv('NODE_ENV', 'production');
    expect(configuration().swagger.enabled).toBe(false);
    vi.unstubAllEnvs();
  });
  it('does not register UI or JSON when documentation is disabled', async () => {
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useValue: new ConfigService({ swagger: { enabled: false } }),
        },
      ],
    }).compile();
    const disabledApp = module.createNestApplication();
    disabledApp.setGlobalPrefix('api');
    setupSwagger(disabledApp);
    await disabledApp.init();
    try {
      await request(disabledApp.getHttpServer()).get('/api/docs').expect(404);
      await request(disabledApp.getHttpServer())
        .get('/api/docs-json')
        .expect(404);
    } finally {
      await disabledApp.close();
    }
  });
  it('preserves real authentication, authorization and validation', async () => {
    await request(app.getHttpServer()).get('/api/users').expect(401);
    database.user.findUnique.mockResolvedValue({
      id: 'test-user',
      storeId: 'test-store',
      role: 'CASHIER',
      isActive: true,
    });
    await request(app.getHttpServer())
      .get('/api/users')
      .auth(token, { type: 'bearer' })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/orders')
      .auth(token, { type: 'bearer' })
      .send({ items: [], unexpected: true })
      .expect(400);
    database.user.findUnique.mockResolvedValue({
      id: 'test-user',
      storeId: 'test-store',
      role: 'OWNER',
      isActive: true,
    });
    await request(app.getHttpServer())
      .get('/api/users/me')
      .auth(token, { type: 'bearer' })
      .expect(400);
    await request(app.getHttpServer())
      .patch('/api/users/me')
      .auth(token, { type: 'bearer' })
      .send({})
      .expect(400);
  });
});
