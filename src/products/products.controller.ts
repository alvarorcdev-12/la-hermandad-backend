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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { ProductsPaginationDto } from './dto/products-pagination.dto';

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
