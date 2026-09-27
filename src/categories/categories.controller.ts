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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @Auth('OWNER', 'MANAGER')
  create(
    @Body() createCategoryDto: CreateCategoryDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.categoriesService.create(createCategoryDto, storeId);
  }

  @Get()
  @Auth()
  findAll(
    @Query() paginationDto: PaginationDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.categoriesService.findAll(paginationDto, storeId);
  }

  @Get(':id')
  @Auth()
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.categoriesService.findOne(id, storeId);
  }

  @Patch(':id')
  @Auth('OWNER', 'MANAGER')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.categoriesService.update(id, storeId, updateCategoryDto);
  }

  @Delete(':id')
  @Auth('OWNER')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.categoriesService.remove(id, storeId);
  }
}
