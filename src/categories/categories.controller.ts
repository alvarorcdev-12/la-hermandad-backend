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

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Auth('OWNER', 'MANAGER')
  @Post()
  create(
    @Body() createCategoryDto: CreateCategoryDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.categoriesService.create(createCategoryDto, storeId);
  }

  @Auth()
  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.categoriesService.findAll(paginationDto, storeId);
  }

  @Auth()
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.categoriesService.findOne(id, storeId);
  }

  @Auth('OWNER', 'MANAGER')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.categoriesService.update(id, storeId, updateCategoryDto);
  }

  @Auth('OWNER')
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.categoriesService.remove(id, storeId);
  }
}
