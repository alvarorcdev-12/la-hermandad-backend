import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { PrismaService } from '../prisma.service.js';
import { PosPinService } from '../users/pos-pin/pos-pin.service.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const jwtSecret = configService.get<string>('jwt.secret');
        if (!jwtSecret) {
          throw new Error(
            'JWT_SECRET no encontrado en las variables de entorno',
          );
        }
        return {
          secret: jwtSecret,
          signOptions: { expiresIn: '24h' },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, JwtStrategy, PosPinService],
  exports: [PassportModule, JwtStrategy, JwtModule],
})
export class AuthModule {}
