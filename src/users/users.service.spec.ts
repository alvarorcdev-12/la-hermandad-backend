import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service.js';
import { Prisma, type User } from '../generated/prisma/client.js';
import { UsersService } from './users.service.js';
import { PosPinService } from './pos-pin/pos-pin.service.js';
import { UserMapper } from './mappers/user.mapper.js';

const user: User = {
  id: 'user-a',
  storeId: 'store-a',
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
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('User PIN creation', () => {
  const database = {
    user: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  };
  const pins = new PosPinService(
    new ConfigService({
      posPin: { encryptionKey: 'a1'.repeat(32), lookupKey: 'b2'.repeat(32) },
    }),
  );
  let service: UsersService;
  let module: Awaited<
    ReturnType<ReturnType<typeof Test.createTestingModule>['compile']>
  >;

  beforeEach(async () => {
    vi.restoreAllMocks();
    database.user.findFirst.mockReset().mockResolvedValue(null);
    database.user.findUnique.mockReset().mockResolvedValue(null);
    database.user.create.mockReset().mockResolvedValue(user);
    module = await Test.createTestingModule({
      providers: [
        {
          provide: UsersService,
          useFactory: (prisma: PrismaService) => new UsersService(prisma, pins),
          inject: [PrismaService],
        },
        { provide: PrismaService, useValue: database },
      ],
    }).compile();
    service = module.get(UsersService);
  });
  afterEach(async () => {
    await module.close();
    vi.restoreAllMocks();
  });

  it('skips trivial candidates and retries store-scoped collisions without writing', async () => {
    vi.spyOn(pins, 'generate')
      .mockReturnValueOnce('000111')
      .mockReturnValueOnce('583027')
      .mockReturnValueOnce('083027');
    database.user.findUnique.mockResolvedValueOnce({ id: 'taken' });
    expect(await service.generatePin('store-a')).toEqual({ pin: '083027' });
    expect(database.user.findUnique).toHaveBeenLastCalledWith({
      where: {
        storeId_posPinLookup: {
          storeId: 'store-a',
          posPinLookup: pins.lookup('083027', 'store-a'),
        },
      },
      select: { id: true },
    });
    expect(database.user.create).not.toHaveBeenCalled();
  });

  it.each(['000000', '583027'])(
    'bounds retries for unavailable candidate %s',
    async (candidate) => {
      const generate = vi.spyOn(pins, 'generate').mockReturnValue(candidate);
      database.user.findUnique.mockResolvedValue({ id: 'taken' });
      await expect(service.generatePin('store-a')).rejects.toMatchObject({
        status: 503,
      });
      expect(generate).toHaveBeenCalledTimes(20);
      expect(database.user.create).not.toHaveBeenCalled();
    },
  );

  it('saves the supplied CASHIER PIN and user in one protected insert', async () => {
    const result = await service.create(
      { firstName: 'Ana', role: 'CASHIER', posPin: '083027' },
      'store-a',
    );
    expect(database.user.findFirst).not.toHaveBeenCalled();
    expect(database.user.create).toHaveBeenCalledTimes(1);
    const data = database.user.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      storeId: 'store-a',
      role: 'CASHIER',
      posPinLookup: pins.lookup('083027', 'store-a'),
    });
    expect(data.posPinEncrypted).toMatch(/^v1\./);
    expect(data).not.toHaveProperty('posPin');
    expect(JSON.stringify(data)).not.toContain('083027');
    expect(result).not.toHaveProperty('posPinEncrypted');
    expect(result).not.toHaveProperty('posPinLookup');
  });

  it.each([undefined, '123456'])(
    'rejects invalid PIN before creating any user',
    async (posPin) => {
      await expect(
        service.create(
          { firstName: 'Ana', role: 'CASHIER', posPin },
          'store-a',
        ),
      ).rejects.toMatchObject({ status: 400 });
      expect(database.user.create).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['store_id', 'pos_pin_lookup'],
    ['storeId', 'posPinLookup'],
    'users_store_id_pos_pin_lookup_key',
  ])(
    'maps the unique constraint conflict without a second write (%s)',
    async (target) => {
      database.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Conflict', {
          code: 'P2002',
          clientVersion: '7.10.0',
          meta: { target },
        }),
      );
      await expect(
        service.create(
          { firstName: 'Ana', role: 'CASHIER', posPin: '583027' },
          'store-a',
        ),
      ).rejects.toMatchObject({
        status: 409,
        message: 'Este PIN ya está en uso. Genera uno nuevo.',
      });
      expect(database.user.create).toHaveBeenCalledTimes(1);
    },
  );

  it.each(['OWNER', 'MANAGER'] as const)(
    'preserves creation without PIN for %s',
    async (role) => {
      await service.create(
        { firstName: 'Ana', email: 'ana@example.com', role },
        'store-a',
      );
      expect(database.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'ana@example.com', storeId: 'store-a' },
      });
      expect(database.user.create.mock.calls[0][0].data).not.toHaveProperty(
        'posPinEncrypted',
      );
      expect(database.user.create.mock.calls[0][0].data).not.toHaveProperty(
        'posPinLookup',
      );
    },
  );

  it('excludes PIN storage fields while preserving the authentication response', () => {
    const result = UserMapper.withoutPosPin({
      ...user,
      store: { id: 'store-a' },
    });
    expect(result).not.toHaveProperty('posPinEncrypted');
    expect(result).not.toHaveProperty('posPinLookup');
    expect(result.store).toEqual({ id: 'store-a' });
  });
});
