import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
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
import type { User } from '../generated/prisma/client.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Me profile

  @Get('me')
  @Auth()
  getMyDataUser(@GetUser() user: User) {
    return this.usersService.getMyDataUser(user);
  }

  @Patch('me')
  @Auth()
  updateMyData(@Body() updateUserDto: UpdateUserDto, @GetUser() user: User) {
    return this.usersService.update(user.id, updateUserDto, user.storeId);
  }

  @Patch('me/password')
  @Auth()
  changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @GetUser() user: User,
  ) {
    return this.usersService.changePassword(changePasswordDto, user);
  }

  @Post()
  @Auth('OWNER', 'MANAGER')
  create(
    @Body() createUserDto: CreateUserDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.usersService.create(createUserDto, storeId);
  }

  @Get()
  @Auth('OWNER', 'MANAGER')
  findAll(
    @Query() paginationDto: PaginationDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.usersService.findAll(paginationDto, storeId);
  }

  @Get(':id')
  @Auth('OWNER', 'MANAGER')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.usersService.findOne(id, storeId);
  }

  @Patch(':id')
  @Auth('OWNER', 'MANAGER')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.usersService.update(id, updateUserDto, storeId);
  }

  @Patch(':id/status')
  @Auth('OWNER')
  changeActiveStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.usersService.changeActiveStatus(id, storeId);
  }

  @Delete(':id')
  @Auth('OWNER')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.usersService.remove(id, storeId);
  }

  // @Patch('me/password')
  // @Auth()
  // changePassword(
  //   @Body() changePasswordDto: ChangePasswordDto,
  //   @GetUser() user: User,
  // ) {
  //   return this.usersService.changePassword(changePasswordDto, user);
  // }
}
