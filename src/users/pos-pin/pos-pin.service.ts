import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createHmac,
  randomBytes,
  randomInt,
} from 'node:crypto';

@Injectable()
export class PosPinService {
  constructor(private readonly configService: ConfigService) {}

  generate(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  lookup(pin: string, storeId: string): string {
    const { lookupKey } = this.keys();
    return createHmac('sha256', lookupKey)
      .update(JSON.stringify([storeId, pin]))
      .digest('hex');
  }

  encrypt(pin: string, storeId: string): string {
    const { encryptionKey } = this.keys();
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', encryptionKey, nonce);
    cipher.setAAD(Buffer.from(storeId));
    const encrypted = Buffer.concat([
      cipher.update(pin, 'utf8'),
      cipher.final(),
    ]);
    return [
      'v1',
      nonce.toString('base64'),
      cipher.getAuthTag().toString('base64'),
      encrypted.toString('base64'),
    ].join('.');
  }

  private keys() {
    const encryption = this.configService.get<string>('posPin.encryptionKey');
    const lookup = this.configService.get<string>('posPin.lookupKey');
    if (
      !encryption ||
      !lookup ||
      !/^[a-f0-9]{64}$/i.test(encryption) ||
      !/^[a-f0-9]{64}$/i.test(lookup) ||
      encryption.toLowerCase() === lookup.toLowerCase()
    ) {
      throw new InternalServerErrorException(
        'Configura claves independientes de 32 bytes en hexadecimal para el PIN.',
      );
    }
    return {
      encryptionKey: Buffer.from(encryption, 'hex'),
      lookupKey: Buffer.from(lookup, 'hex'),
    };
  }
}
