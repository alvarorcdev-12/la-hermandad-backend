import { Module } from '@nestjs/common';
import { SaludController } from './salud.controller.js';
import { PrismaService } from '../prisma.service.js';

@Module({
  controllers: [SaludController],
  providers: [PrismaService],
})
export class SaludModule {}
