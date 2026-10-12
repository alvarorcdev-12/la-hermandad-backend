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
      const storeId = await this.insertUserAndStore();

      // Insertamos categorias
      const categoryId = await this.insertCategories(storeId);

      // Insertamos productos
      await this.insertProducts(storeId, categoryId);

      // Insertamos clientes
      await this.insertCustomers(storeId);

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

    const user = await this.prismaService.user.create({
      data: seedUser,
    });

    return user.storeId;
  }

  private async insertCategories(storeId: string) {
    const seedCategory = initialData.category(storeId);

    const category = await this.prismaService.category.create({
      data: seedCategory,
    });

    return category.id;
  }

  private async insertProducts(storeId: string, categoryId: string) {
    await this.prismaService.product.createMany({
      data: initialData.products(storeId, categoryId),
    });
  }

  private async insertCustomers(storeId: string) {
    await this.prismaService.customer.createMany({
      data: initialData.customers(storeId),
    });
  }
}
