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

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Auth('OWNER', 'MANAGER')
  create(
    @Body() createProductDto: CreateProductDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.productsService.create(createProductDto, storeId);
  }

  @Get()
  @Auth()
  findAll(
    @Query() productsPaginationDto: ProductsPaginationDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.productsService.findAll(productsPaginationDto, storeId);
  }

  @Get(':id')
  @Auth()
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.productsService.findOne(id, storeId);
  }

  @Patch(':id')
  @Auth('OWNER', 'MANAGER')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, storeId, updateProductDto);
  }

  @Delete(':id')
  @Auth('OWNER')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.productsService.remove(id, storeId);
  }
}
