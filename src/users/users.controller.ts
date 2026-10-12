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
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';

import { Auth } from '../auth/decorators/auth.decorator.js';
import { GetUser } from '../auth/decorators/get-user.decorator.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Auth('OWNER')
  @Post()
  create(
    @Body() createUserDto: CreateUserDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.usersService.create(createUserDto, storeId);
  }

  @Auth('OWNER', 'MANAGER')
  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.usersService.findAll(paginationDto, storeId);
  }

  @Auth('OWNER', 'MANAGER')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @GetUser('storeId') storeId: string) {
    return this.usersService.findOne(id, storeId);
  }

  @Auth('OWNER')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.usersService.update(id, updateUserDto, storeId);
  }

  @Auth('OWNER')
  @Patch(':id/status')
  changeActiveStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.usersService.changeActiveStatus(id, storeId);
  }

  @Auth('OWNER')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @GetUser('storeId') storeId: string) {
    return this.usersService.remove(id, storeId);
  }
}
