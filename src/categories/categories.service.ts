import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from 'src/prisma.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';

import type { CategoryWhereInput } from 'src/generated/prisma/models';

@Injectable()
export class CategoriesService {
  constructor(private readonly prismaService: PrismaService) {}
  async create(createCategoryDto: CreateCategoryDto, storeId: string) {
    let { name, description } = createCategoryDto;

    name = name.trim().toLowerCase();

    const existingCategory = await this.prismaService.category.findFirst({
      where: {
        storeId,
        name,
      },
    });

    if (existingCategory) {
      throw new BadRequestException(
        `Category with name ${name} already exists`,
      );
    }

    try {
      return await this.prismaService.category.create({
        data: {
          name,
          description,
          storeId: storeId,
        },
      });
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findAll(paginationDto: PaginationDto, storeId: string) {
    const { page = 1, limit = 10, q, sort, direction } = paginationDto;

    const orderBy = {
      [sort ?? 'createdAt']: direction ?? 'desc',
    };

    const where: CategoryWhereInput = {
      storeId: storeId,
    };

    if (q) {
      where.OR = [
        {
          name: {
            contains: q,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [count, categories] = await Promise.all([
      this.prismaService.category.count({ where }),
      this.prismaService.category.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(count / limit);

    return {
      meta: {
        totalItems: count,
        currentPage: page,
        pageSize: limit,
        totalPages: totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      results: categories.map(({ storeId: _, ...rest }) => rest),
    };
  }

  async findOne(id: string, storeId: string) {
    const category = await this.prismaService.category.findFirst({
      where: {
        id: id,
        storeId: storeId,
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }

    const { storeId: _, ...rest } = category;
    return rest;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    storeId: string,
  ) {
    await this.findOne(id, storeId);

    try {
      return await this.prismaService.category.update({
        where: {
          id: id,
          storeId: storeId,
        },
        data: updateCategoryDto,
      });
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async remove(id: string, storeId: string) {
    await this.findOne(id, storeId);
    try {
      return await this.prismaService.category.delete({
        where: {
          id: id,
          storeId: storeId,
        },
      });
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  private handleDBExceptions(error: any) {
    console.log({ error });
    if (error.code === 'P2002') {
      throw new ConflictException('Duplicate value');
    }

    throw new InternalServerErrorException('Internal server error');
  }
}
