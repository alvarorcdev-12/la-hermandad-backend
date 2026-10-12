import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { createDecipheriv, randomInt } from 'node:crypto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PosPinService } from './pos-pin.service.js';
import { POS_PIN_PATTERN } from './pos-pin.validation.js';
import { CreateUserDto } from '../dto/create-user.dto.js';

vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>();
  return { ...actual, randomInt: vi.fn(actual.randomInt) };
});

const config = () =>
  new ConfigService({
    posPin: { encryptionKey: 'a1'.repeat(32), lookupKey: 'b2'.repeat(32) },
  });

describe('POS PIN', () => {
  it('preserves leading zeros from the cryptographic generator', () => {
    vi.mocked(randomInt).mockImplementationOnce(() => 83027);
    expect(new PosPinService(config()).generate()).toBe('083027');
  });
  it('generates exactly six digits', () => {
    const service = new PosPinService(config());
    for (let i = 0; i < 100; i++)
      expect(service.generate()).toMatch(/^[0-9]{6}$/);
  });

  it.each(['000000', '111111', '999999', '123456', '654321', '000111'])(
    'rejects trivial pattern %s',
    (pin) => {
      expect(POS_PIN_PATTERN.test(pin)).toBe(false);
    },
  );

  it('encrypts with fresh nonces and authenticates the store', () => {
    const service = new PosPinService(config());
    const encrypted = service.encrypt('083027', 'store-a');
    expect(service.encrypt('083027', 'store-a')).not.toBe(encrypted);
    const [version, nonce, tag, ciphertext] = encrypted.split('.');
    expect(version).toBe('v1');
    const decipher = createDecipheriv(
      'aes-256-gcm',
      Buffer.from('a1'.repeat(32), 'hex'),
      Buffer.from(nonce, 'base64'),
    );
    decipher.setAAD(Buffer.from('store-a'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    expect(
      Buffer.concat([
        decipher.update(Buffer.from(ciphertext, 'base64')),
        decipher.final(),
      ]).toString(),
    ).toBe('083027');
    expect(service.lookup('083027', 'store-a')).toMatch(/^[a-f0-9]{64}$/);
    expect(service.lookup('083027', 'store-a')).toBe(
      service.lookup('083027', 'store-a'),
    );
    expect(service.lookup('083027', 'store-a')).not.toBe(
      service.lookup('083027', 'store-b'),
    );
  });

  it.each([
    {},
    { encryptionKey: 'bad', lookupKey: 'b2'.repeat(32) },
    { encryptionKey: 'a1'.repeat(32), lookupKey: 'A1'.repeat(32) },
  ])('rejects missing, invalid or shared keys', (posPin) => {
    expect(() =>
      new PosPinService(new ConfigService({ posPin })).lookup(
        '583027',
        'store-a',
      ),
    ).toThrow('Configura claves independientes');
  });

  it.each([
    undefined,
    null,
    583027,
    '',
    '12345',
    '1234567',
    'abcdef',
    '000000',
    '111111',
    '123456',
    '654321',
    '000111',
  ])('rejects invalid CASHIER PIN %s', async (posPin) => {
    const dto = plainToInstance(CreateUserDto, {
      firstName: 'Ana',
      role: 'CASHIER',
      password: 'secret123',
      posPin,
    });
    expect(
      (await validate(dto)).some((error) => error.property === 'posPin'),
    ).toBe(true);
  });

  it.each(['OWNER', 'MANAGER', 'CASHIER'])(
    'validates role %s with its PIN requirements',
    async (role) => {
      const dto = plainToInstance(CreateUserDto, {
        firstName: 'Ana',
        password: 'secret123',
        role,
        ...(role === 'CASHIER' ? { posPin: '083027' } : {}),
      });
      expect(await validate(dto)).toEqual([]);
    },
  );
});
