import 'reflect-metadata';
import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ValidationPipe } from '@nestjs/common';
import {
  GUARDS_METADATA,
  HEADERS_METADATA,
  HTTP_CODE_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { LoginPinDto } from './dto/login-pin.dto.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { PrismaService } from '../prisma.service.js';
import { PosPinService } from '../users/pos-pin/pos-pin.service.js';
import type { User } from '../generated/prisma/client.js';
import type { JwtPayload } from './interfaces/jwt-payload.interface.js';

const storeId = '83ca14af-404f-4dbb-b15c-20e99311f371';
const otherStoreId = '4f13d75a-aa1e-454b-a8a3-90e2167c62dc';
const posPin = '083027';
const user: User = {
  id: '024f8203-3d30-442e-8a86-c43b49565eb6',
  storeId,
  firstName: 'Ana',
  lastName: null,
  email: null,
  phone: null,
  password: null,
  avatarUrl: null,
  isShopOwner: false,
  isActive: true,
  posPinEncrypted: 'encrypted',
  posPinLookup: 'lookup',
  role: 'CASHIER',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const configuration = new ConfigService({
  jwt: { secret: 'test-only-jwt-secret' },
  posPin: { encryptionKey: 'a1'.repeat(32), lookupKey: 'b2'.repeat(32) },
});

describe('PIN authentication', () => {
  const findUnique = vi.fn<PrismaService['user']['findUnique']>();
  const pins = new PosPinService(configuration);
  const jwt = new JwtService({
    secret: configuration.get<string>('jwt.secret'),
    signOptions: { expiresIn: '24h' },
  });
  let module: TestingModule;
  let auth: AuthService;
  let strategy: JwtStrategy;

  beforeEach(async () => {
    findUnique.mockReset().mockResolvedValue(user);
    module = await Test.createTestingModule({
      providers: [
        { provide: PrismaService, useValue: { user: { findUnique } } },
        { provide: JwtService, useValue: jwt },
        { provide: PosPinService, useValue: pins },
        {
          provide: AuthService,
          useFactory: (
            prisma: PrismaService,
            tokens: JwtService,
            pinService: PosPinService,
          ) => new AuthService(prisma, tokens, pinService),
          inject: [PrismaService, JwtService, PosPinService],
        },
        {
          provide: JwtStrategy,
          useFactory: (prisma: PrismaService) =>
            new JwtStrategy(prisma, configuration),
          inject: [PrismaService],
        },
      ],
    }).compile();
    auth = module.get(AuthService);
    strategy = module.get(JwtStrategy);
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await module.close();
  });

  it('authenticates the supplied PIN with its store and signs a compatible JWT', async () => {
    const result = await auth.loginPin({ storeId, posPin });
    expect(findUnique).toHaveBeenCalledExactlyOnceWith({
      where: {
        storeId_posPinLookup: {
          storeId,
          posPinLookup: pins.lookup(posPin, storeId),
        },
      },
    });
    const payload = jwt.verify<JwtPayload & { exp: number; iat: number }>(
      result.token,
    );
    expect(payload.id).toBe(user.id);
    expect(payload.exp - payload.iat).toBe(24 * 60 * 60);
    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'id']);
    expect(await strategy.validate(payload)).toEqual(user);
    expect(findUnique).toHaveBeenLastCalledWith({
      where: { id: user.id },
      include: { store: true },
    });
    expect(result.user).toMatchObject({
      id: user.id,
      role: 'CASHIER',
      isActive: true,
      name: 'Ana',
    });
    for (const field of [
      'password',
      'posPin',
      'posPinEncrypted',
      'posPinLookup',
    ])
      expect(result.user).not.toHaveProperty(field);
  });

  it('normalizes UUID casing before computing the store-scoped lookup', async () => {
    await auth.loginPin({ storeId: storeId.toUpperCase(), posPin });
    expect(findUnique).toHaveBeenCalledWith({
      where: {
        storeId_posPinLookup: {
          storeId,
          posPinLookup: pins.lookup(posPin, storeId),
        },
      },
    });
  });

  it.each([
    { label: 'unknown PIN', record: null },
    { label: 'inactive cashier', record: { ...user, isActive: false } },
    { label: 'owner', record: { ...user, role: 'OWNER' as const } },
    { label: 'manager', record: { ...user, role: 'MANAGER' as const } },
  ])('rejects $label without issuing a token', async ({ record }) => {
    findUnique.mockResolvedValue(record);
    const sign = vi.spyOn(jwt, 'sign');
    await expect(auth.loginPin({ storeId, posPin })).rejects.toMatchObject({
      status: 401,
      message: 'Credenciales inválidas.',
    });
    expect(sign).not.toHaveBeenCalled();
  });

  it('does not search another store when the PIN is absent in the requested store', async () => {
    findUnique.mockResolvedValue(null);
    await expect(
      auth.loginPin({ storeId: otherStoreId, posPin }),
    ).rejects.toMatchObject({ status: 401 });
    expect(findUnique).toHaveBeenCalledExactlyOnceWith({
      where: {
        storeId_posPinLookup: {
          storeId: otherStoreId,
          posPinLookup: pins.lookup(posPin, otherStoreId),
        },
      },
    });
  });

  it('keeps email/password authentication working for other roles', async () => {
    findUnique.mockResolvedValue({
      ...user,
      role: 'OWNER',
      email: 'ana@example.com',
      password: bcrypt.hashSync('test-password', 4),
    });
    const result = await auth.login({
      email: 'ana@example.com',
      password: 'test-password',
    });
    expect(jwt.verify<JwtPayload>(result.token).id).toBe(user.id);
    expect(findUnique).toHaveBeenCalledWith({
      where: { email: 'ana@example.com' },
      include: { store: true },
    });
  });

  it('rejects an existing token after the cashier is deactivated', async () => {
    const result = await auth.loginPin({ storeId, posPin });
    findUnique.mockResolvedValue({ ...user, isActive: false });
    await expect(
      strategy.validate(jwt.verify<JwtPayload>(result.token)),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('routes PIN login publicly and prevents caching the token response', async () => {
    const controller = new AuthController(auth);
    const descriptor = Object.getOwnPropertyDescriptor(
      AuthController.prototype,
      'loginPin',
    );
    expect(descriptor).toBeDefined();
    const handler: object = descriptor?.value;
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('login-pin');
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(200);
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toBeUndefined();
    expect(Reflect.getMetadata(HEADERS_METADATA, handler)).toContainEqual({
      name: 'Cache-Control',
      value: 'no-store',
    });
    const result = await controller.loginPin({ storeId, posPin });
    expect(jwt.verify<JwtPayload>(result.token).id).toBe(user.id);
  });
});

describe('PIN login validation', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const validate = (body: unknown) =>
    pipe.transform(body, { type: 'body', metatype: LoginPinDto });

  it('accepts a six-digit PIN with a leading zero', async () => {
    expect(await validate({ storeId, posPin })).toEqual({ storeId, posPin });
  });

  it.each([
    undefined,
    null,
    83027,
    '',
    '83027',
    '0830270',
    'abcdef',
    '000000',
    '111111',
    '123456',
    '654321',
    '000111',
  ])('rejects invalid PIN %s', async (value) => {
    await expect(validate({ storeId, posPin: value })).rejects.toMatchObject({
      status: 400,
    });
  });

  it.each([undefined, null, '', 'not-a-uuid'])(
    'requires a valid store UUID (%s)',
    async (value) => {
      await expect(validate({ storeId: value, posPin })).rejects.toMatchObject({
        status: 400,
      });
    },
  );

  it('rejects injected fields', async () => {
    await expect(
      validate({ storeId, posPin, role: 'OWNER' }),
    ).rejects.toMatchObject({ status: 400 });
  });
});
