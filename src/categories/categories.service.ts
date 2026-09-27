import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { CategoryMapper } from './mappers/category.mapper.js';

import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import type { CategoryWhereInput } from '../generated/prisma/models.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto, storeId: string) {
    const { name, description } = createCategoryDto;

    const existingCategory = await this.prismaService.category.findFirst({
      where: {
        storeId,
        name,
      },
    });

    if (existingCategory) {
      throw new BadRequestException(
        `Categoría con el nombre ${name} ya existe`,
      );
    }

    try {
      const category = await this.prismaService.category.create({
        data: {
          name: name.toLowerCase().trim(),
          description,
          storeId: storeId,
        },
      });

      return CategoryMapper.toEntity(category);
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findAll(paginationDto: PaginationDto, storeId: string) {
    const {
      page = 1,
      limit = 10,
      sort = 'createdAt',
      direction,
      q,
    } = paginationDto;

    const orderBy = {
      [sort]: direction || 'desc',
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
      results: CategoryMapper.toEntityList(categories),
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
      throw new NotFoundException(`Categoría con el id ${id} no encontrada`);
    }

    return CategoryMapper.toEntity(category);
  }

  async update(
    id: string,
    storeId: string,
    updateCategoryDto: UpdateCategoryDto,
  ) {
    await this.findOne(id, storeId);

    try {
      const updatedCategory = await this.prismaService.category.update({
        where: {
          id: id,
          storeId: storeId,
        },
        data: updateCategoryDto,
      });

      return CategoryMapper.toEntity(updatedCategory);
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

  private handleDBExceptions(error: any): never {
    if (error instanceof HttpException) {
      throw error;
    }

    if (error instanceof PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002': {
          const target = error.meta?.target as string[] | undefined;
          const fields = target ? target.join(', ') : 'unknown field';

          throw new ConflictException(
            `Duplicate value: The field(s) [${fields}] must be unique.`,
          );
        }

        case 'P2025': {
          const cause = error.meta?.cause as string | undefined;
          throw new NotFoundException(
            cause || 'A required record was not found.',
          );
        }

        case 'P2003': {
          const field = error.meta?.field_name as string | undefined;
          throw new BadRequestException(
            `Cannot perform operation: The referenced ${field || 'field'} does not exist.`,
          );
        }
      }
    }

    // this.logger.error('Unexpected error in OrdersService', error.stack);
    console.log({ error });

    throw new InternalServerErrorException(
      'Internal server error. Please try again later.',
    );
  }
}
