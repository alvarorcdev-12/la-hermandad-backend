import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDocumentationApp } from '../scripts/openapi-app.mjs';
import {
  createOpenApiDocument,
  setupSwagger,
} from '../dist/src/common/openapi/swagger.js';
import {
  MODULE_METADATA,
  PATH_METADATA,
  METHOD_METADATA,
} from '@nestjs/common/constants.js';
import { RequestMethod } from '@nestjs/common';

function controllerRoutes(module, seen = new Set()) {
  if (!module || seen.has(module)) return [];
  seen.add(module);
  const routes = [];
  for (const controller of Reflect.getMetadata(
    MODULE_METADATA.CONTROLLERS,
    module,
  ) || []) {
    const base = Reflect.getMetadata(PATH_METADATA, controller);
    for (const name of Object.getOwnPropertyNames(controller.prototype)) {
      const handler = controller.prototype[name];
      const method = Reflect.getMetadata(METHOD_METADATA, handler);
      if (method === undefined) continue;
      const path = Reflect.getMetadata(PATH_METADATA, handler);
      routes.push([
        RequestMethod[method].toLowerCase(),
        ('/api/' + base + '/' + path)
          .replace(/\/+$/, '')
          .replace(/:(\w+)/g, '{$1}'),
      ]);
    }
  }
  for (const child of Reflect.getMetadata(MODULE_METADATA.IMPORTS, module) ||
    []) {
    routes.push(...controllerRoutes(child.module || child, seen));
  }
  return routes;
}

test('OpenAPI cubre todas las rutas reales, permisos, esquemas y contratos especiales', async () => {
  const app = await createDocumentationApp();
  try {
    const { AppModule } = await import('../dist/src/app.module.js');
    const doc = createOpenApiDocument(app);
    const routes = controllerRoutes(AppModule);
    assert.equal(routes.length, 38);
    const ids = new Set();
    for (const [method, path] of routes) {
      const op = doc.paths[path]?.[method];
      assert.ok(op, `${method} ${path} sin documentar`);
      assert.ok(op.summary && op.description);
      assert.ok(!ids.has(op.operationId));
      ids.add(op.operationId);
      assert.ok(
        op.responses[method === 'post' ? '201' : '200'].content[
          'application/json'
        ].schema,
      );
      assert.ok(op.responses['400']);
      assert.ok(op.responses['500']);
      if (!['/api/auth/login', '/api/auth/register'].includes(path)) {
        assert.deepEqual(op.security, [{ bearer: [] }]);
        assert.ok(op['x-roles'].length);
        assert.ok(op.responses['401']);
      } else assert.ok(!op.security?.length);
      for (const param of op.parameters || [])
        if (param.in === 'path') assert.equal(param.schema.format, 'uuid');
    }
    function visit(value) {
      if (!value || typeof value !== 'object') return;
      if (value.$ref)
        assert.ok(
          value.$ref
            .split('/')
            .slice(1)
            .reduce((node, key) => node?.[key], doc),
          `Referencia inválida ${value.$ref}`,
        );
      for (const child of Object.values(value)) visit(child);
    }
    visit(doc);
    const s = doc.components.schemas;
    assert.deepEqual(s.CreateOrderDto.required, ['items']);
    assert.equal(
      s.CreateOrderDto.properties.items.items.$ref,
      '#/components/schemas/OrderItemDto',
    );
    for (const name of [
      'UpdateOrderDto',
      'UpdateUserDto',
      'UpdateCategoryDto',
      'UpdateProductDto',
      'UpdateCustomerDto',
    ]) {
      assert.ok(!s[name].required?.length);
      assert.ok(Object.keys(s[name].properties).length);
    }
    assert.equal(s.Product.properties.price.type, 'string');
    assert.equal(s.Order.properties.totalPrice.type, 'string');
    assert.ok(s.Order.properties.updateAt);
    assert.equal(s.Order.properties.customer.nullable, true);
    assert.ok(!s.StaffUser.properties.password);
    assert.equal(
      doc.paths['/api/customers'].post.responses['201'].content[
        'application/json'
      ].schema.$ref,
      '#/components/schemas/CustomerRecord',
    );
    assert.equal(
      doc.paths['/api/orders/{id}/payment'].post.responses['201'].content[
        'application/json'
      ].schema.$ref,
      '#/components/schemas/Payment',
    );
    const query = doc.paths['/api/orders'].get.parameters.map((p) => p.name);
    for (const name of [
      'page',
      'limit',
      'q',
      'sort',
      'direction',
      'status',
      'startDate',
      'endDate',
    ])
      assert.ok(query.includes(name));
  } finally {
    await app.close();
  }
});

test('Swagger publica UI, JSON y YAML con prefijo configurable', async () => {
  const app = await createDocumentationApp('v2');
  try {
    setupSwagger(app, '/v2/');
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const ui = await fetch(`${base}/v2/docs`);
    assert.equal(ui.status, 200);
    assert.match(await ui.text(), /swagger-ui/);
    const json = await fetch(`${base}/v2/docs/openapi.json`);
    assert.equal(json.status, 200);
    assert.ok((await json.json()).paths['/v2/orders']);
    const yaml = await fetch(`${base}/v2/docs/openapi.yaml`);
    assert.equal(yaml.status, 200);
    assert.match(await yaml.text(), /openapi:/);
    const protectedRoute = await fetch(`${base}/v2/products`);
    assert.equal(protectedRoute.status, 401);
    const badLogin = await fetch(`${base}/v2/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unknown: true }),
    });
    assert.equal(badLogin.status, 400);
    assert.ok(Array.isArray((await badLogin.json()).message));
  } finally {
    await app.close();
  }
});
