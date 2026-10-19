import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
  ApiProduces,
  ApiParam,
} from '@nestjs/swagger';
import {
  ApiErrors,
  ApiPage,
} from '../common/openapi/api-response.decorator.js';
import { Product } from './entities/product.entity.js';

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
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductsPaginationDto } from './dto/products-pagination.dto.js';

import { Auth } from '../auth/decorators/auth.decorator.js';
import { GetUser } from '../auth/decorators/get-user.decorator.js';

@ApiTags('Productos')
@ApiProduces('application/json')
@ApiErrors({ 500: 'Error interno o fallo de acceso a los datos.' })
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @ApiOperation({
    summary: 'Crear productos',
    description:
      'Opera sobre datos de la tienda del usuario autenticado. Autenticación Bearer JWT. Roles: OWNER, MANAGER.',
    operationId: 'products_create',
  })
  @ApiConsumes('application/json')
  @ApiBody({ type: CreateProductDto, required: true })
  @ApiErrors({
    '400':
      'Parámetros o cuerpo inválidos, propiedades no permitidas o regla de negocio incumplida.',
    '409': 'Conflicto de unicidad en los datos.',
  })
  @ApiResponse({
    status: 201,
    description: 'Operación completada.',
    type: Product,
  })
  @Post()
  @Auth('OWNER', 'MANAGER')
  create(
    @Body() createProductDto: CreateProductDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.productsService.create(createProductDto, storeId);
  }

  @ApiOperation({
    summary: 'Listar productos',
    description:
      'Opera sobre datos de la tienda del usuario autenticado. Paginación con meta y results; page=1 y limit=10 por defecto. Orden por createdAt, asc en usuarios y desc en los demás módulos. Búsqueda q por título o SKU. Autenticación Bearer JWT. Roles: OWNER, MANAGER, CASHIER.',
    operationId: 'products_findAll',
  })
  @ApiErrors({
    '400':
      'Parámetros o cuerpo inválidos, propiedades no permitidas o regla de negocio incumplida.',
  })
  @ApiPage(Product)
  @Get()
  @Auth()
  findAll(
    @Query() productsPaginationDto: ProductsPaginationDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.productsService.findAll(productsPaginationDto, storeId);
  }

  @ApiOperation({
    summary: 'Consultar productos',
    description:
      'Opera sobre datos de la tienda del usuario autenticado. Autenticación Bearer JWT. Roles: OWNER, MANAGER, CASHIER.',
    operationId: 'products_findOne',
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
    type: Product,
  })
  @Get(':id')
  @Auth()
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.productsService.findOne(id, storeId);
  }

  @ApiOperation({
    summary: 'Actualizar productos',
    description:
      'Opera sobre datos de la tienda del usuario autenticado. Autenticación Bearer JWT. Roles: OWNER, MANAGER.',
    operationId: 'products_update',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador del recurso.',
    type: 'string',
    format: 'uuid',
  })
  @ApiConsumes('application/json')
  @ApiBody({ type: UpdateProductDto, required: true })
  @ApiErrors({
    '400':
      'Parámetros o cuerpo inválidos, propiedades no permitidas o regla de negocio incumplida.',
    '404': 'Recurso no encontrado en la tienda autenticada.',
    '409': 'Conflicto de unicidad en los datos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Operación completada.',
    type: Product,
  })
  @Patch(':id')
  @Auth('OWNER', 'MANAGER')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, storeId, updateProductDto);
  }

  @ApiOperation({
    summary: 'Eliminar productos',
    description:
      'Elimina el producto de la tienda. Si tiene artículos de pedidos asociados, la restricción de base de datos impide eliminarlo. Autenticación Bearer JWT. Roles: OWNER.',
    operationId: 'products_remove',
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
    type: Product,
  })
  @Delete(':id')
  @Auth('OWNER')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.productsService.remove(id, storeId);
  }
}
