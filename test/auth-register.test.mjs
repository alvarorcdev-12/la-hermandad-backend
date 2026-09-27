import assert from 'node:assert/strict';
import { test } from 'node:test';
import bcrypt from 'bcrypt';
import { AuthService } from '../dist/src/auth/auth.service.js';
import { Prisma } from '../dist/src/generated/prisma/client.js';

const dto = {
  email: 'register@example.com',
  firstName: 'Alvaro',
  storeName: 'Tienda',
  password: 'Example123!',
};

function setup({ existing = null, failure } = {}) {
  const writes = [];
  const service = new AuthService(
    {
      user: {
        findUnique: async () => existing,
        create: async ({ data }) => {
          writes.push(data);
          if (failure) throw failure;
          return {
            ...data,
            id: 'user-id',
            store: { name: data.store.create.name },
          };
        },
      },
    },
    { sign: ({ id }) => `token:${id}` },
  );
  return { service, writes };
}

test('registration returns a token without exposing the password, including without lastName', async () => {
  const { service, writes } = setup();
  const result = await service.register(dto);
  assert.equal(result.token, 'token:user-id');
  assert.equal(result.user.storeName, dto.storeName);
  assert.deepEqual(result.user.initials, ['A', 'L']);
  assert.equal(result.user.password, undefined);
  assert.equal(await bcrypt.compare(dto.password, writes[0].password), true);
  assert.equal(writes[0].role, 'OWNER');
  assert.equal(writes[0].isShopOwner, true);
  assert.deepEqual(writes[0].store.create.settings, { create: {} });
  assert.equal(writes[0].store.create.locations.create.isDefault, true);
});

test('existing email is rejected before writing', async () => {
  const { service, writes } = setup({ existing: { id: 'existing' } });
  await assert.rejects(
    service.register(dto),
    /El correo electrónico ya existe/,
  );
  assert.equal(writes.length, 0);
});

test('concurrent duplicate registration returns a client error', async () => {
  const failure = new Prisma.PrismaClientKnownRequestError(
    'Unique constraint',
    {
      code: 'P2002',
      clientVersion: '7.8.0',
      meta: { target: ['email'] },
    },
  );
  const { service } = setup({ failure });
  await assert.rejects(
    service.register(dto),
    (error) =>
      error.getStatus() === 400 &&
      error.message === 'El correo electrónico ya existe',
  );
});

test('database failures are propagated without issuing a token', async () => {
  const failure = new Error('Database unavailable');
  const { service } = setup({ failure });
  await assert.rejects(service.register(dto), (error) => error === failure);
});
