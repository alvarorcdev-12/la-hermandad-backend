import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/prisma.service';
import { ProductsPaginationDto } from './dto/products-pagination.dto';

import type {
  ProductOrderByWithRelationInput,
  ProductWhereInput,
} from 'src/generated/prisma/models';
import { ProductsMapper } from './mappers/products.mapper';

@Injectable()
export class ProductsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createProductDto: CreateProductDto, storeId: string) {
    try {
      const product = await this.prismaService.product.create({
        data: {
          ...createProductDto,
          storeId: storeId,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return ProductsMapper.toProductResponseDto(product);
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findAll(productsPaginationDto: ProductsPaginationDto, storeId: string) {
    const {
      page = 1,
      limit = 10,
      sort,
      direction,
      q,
      status,
      category,
    } = productsPaginationDto;

    const orderBy: ProductOrderByWithRelationInput = {
      [sort ?? 'createdAt']: direction ?? 'desc',
    };

    const where: ProductWhereInput = {
      storeId,
      status: status,
    };

    if (q) {
      where.OR = [
        {
          title: {
            contains: q,
            mode: 'insensitive',
          },
        },
        {
          sku: {
            contains: q,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (category) {
      where.category = {
        name: {
          equals: category,
          mode: 'insensitive',
        },
      };
    }

    const [count, products] = await Promise.all([
      this.prismaService.product.count({
        where,
      }),
      this.prismaService.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
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
      results: ProductsMapper.toProductResponseDtoList(products),
    };
  }

  async findOne(id: string, storeId: string) {
    const product = await this.prismaService.product.findFirst({
      where: {
        id: id,
        storeId: storeId,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    return ProductsMapper.toProductResponseDto(product);
  }

  async update(
    id: string,
    storeId: string,
    updateProductDto: UpdateProductDto,
  ) {
    await this.findOne(id, storeId);

    try {
      const updateProduct = await this.prismaService.product.update({
        where: {
          id: id,
          storeId: storeId,
        },
        data: updateProductDto,
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return ProductsMapper.toProductResponseDto(updateProduct);
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async remove(id: string, storeId: string) {
    await this.findOne(id, storeId);

    try {
      const deletedProduct = await this.prismaService.product.delete({
        where: {
          id: id,
          storeId: storeId,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return ProductsMapper.toProductResponseDto(deletedProduct);
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
