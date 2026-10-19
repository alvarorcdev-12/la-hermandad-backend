import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
  ApiProduces,
  ApiParam,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  ApiErrors,
  ApiPage,
} from '../common/openapi/api-response.decorator.js';
import { Category } from './entities/category.entity.js';

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';

import { Auth } from '../auth/decorators/auth.decorator.js';
import { GetUser } from '../auth/decorators/get-user.decorator.js';

@ApiTags('Categorías')
@ApiProduces('application/json')
@ApiErrors({ 500: 'Error interno o fallo de acceso a los datos.' })
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Auth('OWNER', 'MANAGER')
  @ApiOperation({
    summary: 'Crear categorías',
    description:
      'Crea una categoría de la tienda. Normaliza el nombre a minúsculas sin espacios extremos; el mapper capitaliza la primera letra. Autenticación Bearer JWT. Roles: OWNER, MANAGER.',
    operationId: 'categories_create',
  })
  @ApiConsumes('application/json')
  @ApiBody({ type: CreateCategoryDto, required: true })
  @ApiErrors({
    '400':
      'Parámetros o cuerpo inválidos, propiedades no permitidas o regla de negocio incumplida.',
    '409': 'Conflicto de unicidad en los datos.',
  })
  @ApiResponse({
    status: 201,
    description: 'Operación completada.',
    type: Category,
  })
  @Post()
  create(
    @Body() createCategoryDto: CreateCategoryDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.categoriesService.create(createCategoryDto, storeId);
  }

  @Auth()
  @ApiOperation({
    summary: 'Listar categorías',
    description:
      'Opera sobre datos de la tienda del usuario autenticado. Paginación con meta y results; page=1 y limit=10 por defecto. Orden por createdAt, asc en usuarios y desc en los demás módulos. Búsqueda q por nombre. Autenticación Bearer JWT. Roles: OWNER, MANAGER, CASHIER.',
    operationId: 'categories_findAll',
  })
  @ApiErrors({
    '400':
      'Parámetros o cuerpo inválidos, propiedades no permitidas o regla de negocio incumplida.',
  })
  @ApiPage(Category)
  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.categoriesService.findAll(paginationDto, storeId);
  }

  @Auth()
  @ApiOperation({
    summary: 'Consultar categorías',
    description:
      'Opera sobre datos de la tienda del usuario autenticado. Autenticación Bearer JWT. Roles: OWNER, MANAGER, CASHIER.',
    operationId: 'categories_findOne',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador del recurso.',
    type: 'string',
    format: 'uuid',
  })
  @ApiErrors({
    '400':
      'Parámetros o cuerpo inválidos, propiedades no permitidas o regla de negocio incumplida.',
    '404': 'Recurso no encontrado en la tienda autenticada.',
  })
  @ApiResponse({
    status: 200,
    description: 'Operación completada.',
    type: Category,
  })
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.categoriesService.findOne(id, storeId);
  }

  @Auth('OWNER', 'MANAGER')
  @ApiOperation({
    summary: 'Actualizar categorías',
    description:
      'Opera sobre datos de la tienda del usuario autenticado. Autenticación Bearer JWT. Roles: OWNER, MANAGER.',
    operationId: 'categories_update',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador del recurso.',
    type: 'string',
    format: 'uuid',
  })
  @ApiConsumes('application/json')
  @ApiBody({ type: UpdateCategoryDto, required: true })
  @ApiErrors({
    '400':
      'Parámetros o cuerpo inválidos, propiedades no permitidas o regla de negocio incumplida.',
    '404': 'Recurso no encontrado en la tienda autenticada.',
    '409': 'Conflicto de unicidad en los datos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Operación completada.',
    type: Category,
  })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.categoriesService.update(id, storeId, updateCategoryDto);
  }

  @Auth('OWNER')
  @ApiOperation({
    summary: 'Eliminar categorías',
    description:
      'Elimina la categoría de la tienda; los productos asociados quedan sin categoría. Devuelve campos persistidos, incluido storeId. Autenticación Bearer JWT. Roles: OWNER.',
    operationId: 'categories_remove',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador del recurso.',
    type: 'string',
    format: 'uuid',
  })
  @ApiErrors({
    '400':
      'Parámetros o cuerpo inválidos, propiedades no permitidas o regla de negocio incumplida.',
    '404': 'Recurso no encontrado en la tienda autenticada.',
  })
  @ApiExtraModels(Category)
  @ApiResponse({
    status: 200,
    description: 'Operación completada.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Category) },
        {
          type: 'object',
          required: ['storeId'],
          properties: {
            storeId: {
              type: 'string',
              format: 'uuid',
              description: 'Tienda de la categoría eliminada.',
            },
          },
        },
      ],
    },
  })
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.categoriesService.remove(id, storeId);
  }
}
