import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';


@Controller('salud')
export class SaludController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get()
  async salud() {
    return await this.prismaService.$queryRaw`SELECT 1`;
  }
}
