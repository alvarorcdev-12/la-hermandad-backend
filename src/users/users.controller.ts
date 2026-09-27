import { ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from '../common/openapi/api-endpoint.decorator.js';
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

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Me profile

  @Get('me')
  @Auth()
  @ApiEndpoint(
    'Consultar mi perfil',
    'Devuelve el perfil del personal autenticado, sin storeName ni contraseña. Roles permitidos: OWNER, MANAGER, CASHIER.',
    'StaffUser',
    200,
    [],
    [],
  )
  getMyDataUser(@GetUser() user: User) {
    return this.usersService.getMyDataUser(user);
  }

  @Patch('me')
  @Auth()
  @ApiEndpoint(
    'Actualizar mi perfil',
    'Actualiza firstName, lastName, email, phone y role. El DTO actual también acepta password, pero el servicio lo ignora; use me/password. Actualmente también permite enviar role en esta ruta. Roles permitidos: OWNER, MANAGER, CASHIER.',
    'StaffUser',
    200,
    [],
    [],
  )
  updateMyData(@Body() updateUserDto: UpdateUserDto, @GetUser() user: User) {
    return this.usersService.update(user.id, updateUserDto, user.storeId);
  }

  @Patch('me/password')
  @Auth()
  @ApiEndpoint(
    'Cambiar mi contraseña',
    'Comprueba la contraseña actual y exige una nueva diferente de al menos seis caracteres. Devuelve el perfil del personal. Roles permitidos: OWNER, MANAGER, CASHIER.',
    'StaffUser',
    200,
    [],
    [],
  )
  changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @GetUser() user: User,
  ) {
    return this.usersService.changePassword(changePasswordDto, user);
  }

  @Post()
  @Auth('OWNER', 'MANAGER')
  @ApiEndpoint(
    'Crear usuario',
    'Crea un registro asociado a la tienda del usuario autenticado. Roles permitidos: OWNER, MANAGER.',
    'StaffUser',
    201,
    [],
    [],
  )
  create(
    @Body() createUserDto: CreateUserDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.usersService.create(createUserDto, storeId);
  }

  @Get()
  @Auth('OWNER', 'MANAGER')
  @ApiEndpoint(
    'Listar usuarios',
    'Listado paginado por tienda. Busca por nombre, apellido, correo o teléfono. Orden predeterminado createdAt desc. Roles permitidos: OWNER, MANAGER.',
    'StaffUserPage',
    200,
    [],
    [],
  )
  findAll(
    @Query() paginationDto: PaginationDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.usersService.findAll(paginationDto, storeId);
  }

  @Get(':id')
  @Auth('OWNER', 'MANAGER')
  @ApiEndpoint(
    'Consultar usuario',
    'Obtiene el registro identificado por UUID dentro de la tienda del usuario. Usuario inexistente devuelve 400. Roles permitidos: OWNER, MANAGER.',
    'StaffUser',
    200,
    ['id'],
    [],
  )
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.usersService.findOne(id, storeId);
  }

  @Patch(':id')
  @Auth('OWNER', 'MANAGER')
  @ApiEndpoint(
    'Actualizar usuario',
    'Actualiza datos y rol. password es aceptado por el DTO pero ignorado por este servicio. Roles permitidos: OWNER, MANAGER.',
    'StaffUser',
    200,
    ['id'],
    [409],
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.usersService.update(id, updateUserDto, storeId);
  }

  @Patch(':id/status')
  @Auth('OWNER')
  @ApiEndpoint(
    'Alternar estado activo',
    'Invierte isActive; no recibe cuerpo. No fija un estado explícito. Roles permitidos: OWNER.',
    'StaffUser',
    200,
    ['id'],
    [],
  )
  changeActiveStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.usersService.changeActiveStatus(id, storeId);
  }

  @Delete(':id')
  @Auth('OWNER')
  @ApiEndpoint(
    'Eliminar usuario',
    'Elimina el registro y devuelve sus datos. Las relaciones existentes pueden impedir la eliminación. Roles permitidos: OWNER.',
    'StaffUser',
    200,
    ['id'],
    [409],
  )
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.usersService.remove(id, storeId);
  }
}
