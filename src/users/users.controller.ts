import {
  BadRequestException,
  Controller,
  Header,
  HttpCode,
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
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

import { Auth } from '../auth/decorators/auth.decorator.js';
import { GetUser } from '../auth/decorators/get-user.decorator.js';

import type { User } from '../generated/prisma/client.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Auth()
  @Get('me/pos-pin')
  @Header('Cache-Control', 'no-store')
  getMyPosPin(
    @GetUser('id') id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.usersService.getPosPin(id, storeId);
  }

  @Auth('OWNER')
  @Get(':id/pos-pin')
  @Header('Cache-Control', 'no-store')
  getEmployeePosPin(
    @Param(
      'id',
      new ParseUUIDPipe({
        exceptionFactory: () =>
          new BadRequestException(
            'El identificador del usuario debe ser un UUID válido.',
          ),
      }),
    )
    id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.usersService.getPosPin(id, storeId);
  }

  @Auth('OWNER')
  @Post('generate-pin')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  generatePin(@GetUser('storeId') storeId: string) {
    return this.usersService.generatePin(storeId);
  }

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
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
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
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.usersService.remove(id, storeId);
  }

  // PROFILE
  @Auth()
  @Get('me')
  getMyDataUser(@GetUser() user: User) {
    return this.usersService.getMyDataUser(user);
  }

  @Auth()
  @Patch('me')
  updateMyData(@Body() updateUserDto: UpdateUserDto, @GetUser() user: User) {
    return this.usersService.updateProfile(updateUserDto, user);
  }

  @Auth()
  @Patch('me/password')
  changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @GetUser() user: User,
  ) {
    return this.usersService.changePassword(changePasswordDto, user);
  }
}
