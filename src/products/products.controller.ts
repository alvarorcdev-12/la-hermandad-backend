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
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { Auth } from '../auth/decorators/auth.decorator.js';
import { GetUser } from '../auth/decorators/get-user.decorator.js';
import { ProductsPaginationDto } from './dto/products-pagination.dto.js';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Auth('OWNER', 'MANAGER')
  @ApiEndpoint(
    'Crear producto',
    'Crea un registro asociado a la tienda del usuario autenticado. Roles permitidos: OWNER, MANAGER.',
    'Product',
    201,
    [],
    [409],
  )
  create(
    @Body() createProductDto: CreateProductDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.productsService.create(createProductDto, storeId);
  }

  @Get()
  @Auth()
  @ApiEndpoint(
    'Listar productos',
    'Listado paginado por tienda. Busca por título o SKU; permite status y nombre exacto de category. Orden predeterminado createdAt desc. Roles permitidos: OWNER, MANAGER, CASHIER.',
    'ProductPage',
    200,
    [],
    [],
  )
  findAll(
    @Query() productsPaginationDto: ProductsPaginationDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.productsService.findAll(productsPaginationDto, storeId);
  }

  @Get(':id')
  @Auth()
  @ApiEndpoint(
    'Consultar producto',
    'Obtiene el registro identificado por UUID dentro de la tienda del usuario. Roles permitidos: OWNER, MANAGER, CASHIER.',
    'Product',
    200,
    ['id'],
    [404],
  )
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.productsService.findOne(id, storeId);
  }

  @Patch(':id')
  @Auth('OWNER', 'MANAGER')
  @ApiEndpoint(
    'Actualizar producto',
    'Actualización parcial: las propiedades omitidas conservan su valor. Roles permitidos: OWNER, MANAGER.',
    'Product',
    200,
    ['id'],
    [404, 409],
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, storeId, updateProductDto);
  }

  @Delete(':id')
  @Auth('OWNER')
  @ApiEndpoint(
    'Eliminar producto',
    'Elimina el registro y devuelve sus datos. Las relaciones existentes pueden impedir la eliminación. Roles permitidos: OWNER.',
    'Product',
    200,
    ['id'],
    [404, 409],
  )
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.productsService.remove(id, storeId);
  }
}
