import { ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from '../common/openapi/api-endpoint.decorator.js';
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
import { Auth } from '../auth/decorators/auth.decorator.js';
import { GetUser } from '../auth/decorators/get-user.decorator.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @Auth('OWNER', 'MANAGER')
  @ApiEndpoint(
    'Crear categoría',
    'Crea un registro asociado a la tienda del usuario autenticado. Roles permitidos: OWNER, MANAGER.',
    'Category',
    201,
    [],
    [409],
  )
  create(
    @Body() createCategoryDto: CreateCategoryDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.categoriesService.create(createCategoryDto, storeId);
  }

  @Get()
  @Auth()
  @ApiEndpoint(
    'Listar categorías',
    'Listado paginado por tienda. Busca por nombre. Orden predeterminado createdAt desc. Roles permitidos: OWNER, MANAGER, CASHIER.',
    'CategoryPage',
    200,
    [],
    [],
  )
  findAll(
    @Query() paginationDto: PaginationDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.categoriesService.findAll(paginationDto, storeId);
  }

  @Get(':id')
  @Auth()
  @ApiEndpoint(
    'Consultar categoría',
    'Obtiene el registro identificado por UUID dentro de la tienda del usuario. Roles permitidos: OWNER, MANAGER, CASHIER.',
    'Category',
    200,
    ['id'],
    [404],
  )
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.categoriesService.findOne(id, storeId);
  }

  @Patch(':id')
  @Auth('OWNER', 'MANAGER')
  @ApiEndpoint(
    'Actualizar categoría',
    'Actualización parcial: las propiedades omitidas conservan su valor. Roles permitidos: OWNER, MANAGER.',
    'Category',
    200,
    ['id'],
    [404, 409],
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.categoriesService.update(id, storeId, updateCategoryDto);
  }

  @Delete(':id')
  @Auth('OWNER')
  @ApiEndpoint(
    'Eliminar categoría',
    'Elimina el registro y devuelve sus datos. Las relaciones existentes pueden impedir la eliminación. Devuelve también storeId y el nombre almacenado sin transformación. Roles permitidos: OWNER.',
    'DeletedCategory',
    200,
    ['id'],
    [404, 409],
  )
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.categoriesService.remove(id, storeId);
  }
}
