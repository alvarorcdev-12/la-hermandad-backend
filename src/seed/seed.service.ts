import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { initialData } from './data/seed-data.js';

@Injectable()
export class SeedService {
  constructor(private readonly prismaService: PrismaService) {}

  async runSeed() {
    try {
      // Limpiar toda la DB
      await this.deleteTables();

      // Insertar usuarios, store,setting, location por defecto
      await this.insertUserAndStore();

      return {
        ok: true,
        message: 'SEED EXECUTED',
      };
    } catch (error) {
      console.log({ error });
      throw new InternalServerErrorException('UNEXECUTED SEED');
    }
  }
  private async deleteTables() {
    // TODO EN CASCADA desde la store?
    await this.prismaService.store.deleteMany({});
  }

  private async insertUserAndStore() {
    const seedUser = initialData.user;

    await this.prismaService.user.create({
      data: seedUser,
    });
  }
}
