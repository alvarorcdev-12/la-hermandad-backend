import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module.js';
import configuration from './config/configuration.js';
import { PrismaService } from './prisma.service.js';
import { SeedModule } from './seed/seed.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { ProductsModule } from './products/products.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
      load: [configuration],
    }),
    AuthModule,
    SeedModule,
    CategoriesModule,
    ProductsModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
