import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
  ApiProduces,
  ApiParam,
} from '@nestjs/swagger';
import {
  ApiErrors,
  ApiPage,
} from '../common/openapi/api-response.decorator.js';
import { StaffUser } from './entities/staff-user.entity.js';
import { User as UserResponse } from './entities/user.entity.js';
import { PinResponseDto } from '../common/openapi/response.dto.js';
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

@ApiTags('Usuarios')
@ApiProduces('application/json')
@ApiErrors({ 500: 'Error interno o fallo de acceso a los datos.' })
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Auth()
  @ApiOperation({
    summary: 'Consultar mi PIN POS',
    description:
      'Devuelve el PIN asignado al usuario autenticado. Devuelve 400 si no existe usuario o PIN. Cache-Control: no-store. Autenticación Bearer JWT. Roles: OWNER, MANAGER, CASHIER.',
    operationId: 'users_getMyPosPin',
  })
  @ApiErrors({
    '400': 'Identificador inválido, usuario no encontrado o PIN no asignado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Operación completada.',
    type: PinResponseDto,
    headers: {
      'Cache-Control': {
        description: 'Impide almacenar la respuesta sensible.',
        schema: { type: 'string', enum: ['no-store'] },
      },
    },
  })
  @Get('me/pos-pin')
  @Header('Cache-Control', 'no-store')
  getMyPosPin(@GetUser('id') id: string, @GetUser('storeId') storeId: string) {
    return this.usersService.getPosPin(id, storeId);
  }

  @Auth('OWNER')
  @ApiOperation({
    summary: 'Consultar el PIN POS de un empleado',
    description:
      'Devuelve el PIN de un usuario de la misma tienda. Devuelve 400 si no existe usuario o PIN. Cache-Control: no-store. Autenticación Bearer JWT. Roles: OWNER.',
    operationId: 'users_getEmployeePosPin',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador del recurso.',
    type: 'string',
    format: 'uuid',
  })
  @ApiErrors({
    '400': 'Identificador inválido, usuario no encontrado o PIN no asignado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Operación completada.',
    type: PinResponseDto,
    headers: {
      'Cache-Control': {
        description: 'Impide almacenar la respuesta sensible.',
        schema: { type: 'string', enum: ['no-store'] },
      },
    },
  })
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
  @ApiOperation({
    summary: 'Generar un PIN POS disponible',
    description:
      'Genera un candidato disponible tras un máximo de 20 intentos. No lo reserva ni lo guarda: debe enviarse al crear el empleado. Cache-Control: no-store. Autenticación Bearer JWT. Roles: OWNER.',
    operationId: 'users_generatePin',
  })
  @ApiErrors({ '503': 'No se encontró un PIN disponible tras 20 intentos.' })
  @ApiResponse({
    status: 200,
    description: 'Operación completada.',
    type: PinResponseDto,
    headers: {
      'Cache-Control': {
        description: 'Impide almacenar la respuesta sensible.',
        schema: { type: 'string', enum: ['no-store'] },
      },
    },
  })
  @Post('generate-pin')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  generatePin(@GetUser('storeId') storeId: string) {
    return this.usersService.generatePin(storeId);
  }

  @Auth('OWNER')
  @ApiOperation({
    summary: 'Crear usuarios',
    description:
      'Crea personal en la tienda autenticada. CASHIER requiere PIN no trivial y único por tienda. Solo se asigna PIN a CASHIER. Email tiene unicidad global. La respuesta excluye contraseñas y almacenamiento criptográfico. Autenticación Bearer JWT. Roles: OWNER.',
    operationId: 'users_create',
  })
  @ApiConsumes('application/json')
  @ApiBody({ type: CreateUserDto, required: true })
  @ApiErrors({
    '400':
      'Parámetros o cuerpo inválidos, propiedades no permitidas o regla de negocio incumplida.',
    '409': 'Conflicto de unicidad en los datos.',
  })
  @ApiResponse({
    status: 201,
    description: 'Operación completada.',
    type: StaffUser,
  })
  @Post()
  create(
    @Body() createUserDto: CreateUserDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.usersService.create(createUserDto, storeId);
  }

  @Auth('OWNER', 'MANAGER')
  @ApiOperation({
    summary: 'Listar usuarios',
    description:
      'Opera sobre datos de la tienda del usuario autenticado. Paginación con meta y results; page=1 y limit=10 por defecto. Orden por createdAt, asc en usuarios y desc en los demás módulos. Búsqueda q por nombres, apellidos, correo o teléfono. Autenticación Bearer JWT. Roles: OWNER, MANAGER.',
    operationId: 'users_findAll',
  })
  @ApiErrors({
    '400':
      'Parámetros o cuerpo inválidos, propiedades no permitidas o regla de negocio incumplida.',
  })
  @ApiPage(StaffUser)
  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.usersService.findAll(paginationDto, storeId);
  }

  @Auth('OWNER', 'MANAGER')
  @ApiOperation({
    summary: 'Consultar usuarios',
    description:
      'Opera sobre datos de la tienda del usuario autenticado. Autenticación Bearer JWT. Roles: OWNER, MANAGER.',
    operationId: 'users_findOne',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador del recurso.',
    type: 'string',
    format: 'uuid',
  })
  @ApiErrors({
    '400': 'Identificador inválido, usuario no encontrado o PIN no asignado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Operación completada.',
    type: StaffUser,
  })
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.usersService.findOne(id, storeId);
  }

  @Auth('OWNER')
  @ApiOperation({
    summary: 'Actualizar usuarios',
    description:
      'Actualiza nombres, correo, teléfono y rol. password y posPin se aceptan y validan pero se ignoran; esta operación no cambia esas credenciales. Autenticación Bearer JWT. Roles: OWNER.',
    operationId: 'users_update',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador del recurso.',
    type: 'string',
    format: 'uuid',
  })
  @ApiConsumes('application/json')
  @ApiBody({ type: UpdateUserDto, required: true })
  @ApiErrors({
    '400':
      'Parámetros o cuerpo inválidos, propiedades no permitidas o regla de negocio incumplida.',
    '409': 'Conflicto de unicidad en los datos.',
    '404': 'Registro requerido no encontrado durante la escritura.',
  })
  @ApiResponse({
    status: 200,
    description: 'Operación completada.',
    type: StaffUser,
  })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.usersService.update(id, updateUserDto, storeId);
  }

  @Auth('OWNER')
  @ApiOperation({
    summary: 'Alternar estado activo del usuario',
    description:
      'Invierte isActive del usuario de la misma tienda. Autenticación Bearer JWT. Roles: OWNER.',
    operationId: 'users_changeActiveStatus',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador del recurso.',
    type: 'string',
    format: 'uuid',
  })
  @ApiErrors({
    '400': 'Identificador inválido, usuario no encontrado o PIN no asignado.',
    '404': 'Registro requerido no encontrado durante la escritura.',
  })
  @ApiResponse({
    status: 200,
    description: 'Operación completada.',
    type: StaffUser,
  })
  @Patch(':id/status')
  changeActiveStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.usersService.changeActiveStatus(id, storeId);
  }

  @Auth('OWNER')
  @ApiOperation({
    summary: 'Eliminar usuarios',
    description:
      'Opera sobre datos de la tienda del usuario autenticado. Autenticación Bearer JWT. Roles: OWNER.',
    operationId: 'users_remove',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador del recurso.',
    type: 'string',
    format: 'uuid',
  })
  @ApiErrors({
    '400': 'Identificador inválido, usuario no encontrado o PIN no asignado.',
    '404': 'Registro requerido no encontrado durante la escritura.',
  })
  @ApiResponse({
    status: 200,
    description: 'Operación completada.',
    type: StaffUser,
  })
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.usersService.remove(id, storeId);
  }

  // PROFILE
  @Auth()
  @ApiOperation({
    summary: 'Consultar mi perfil',
    description:
      'Consulta el perfil propio. Limitación actual: GET /users/:id está registrado antes y captura /users/me, por lo que devuelve 400 para OWNER/MANAGER y 403 para CASHIER. Autenticación Bearer JWT. Roles: OWNER, MANAGER, CASHIER.',
    operationId: 'users_getMyDataUser',
  })
  @ApiResponse({
    status: 200,
    description: 'Operación completada.',
    type: StaffUser,
  })
  @ApiErrors({
    400: 'La ruta dinámica previa interpreta me como UUID inválido.',
    403: 'La ruta dinámica previa requiere OWNER o MANAGER.',
  })
  @Get('me')
  getMyDataUser(@GetUser() user: User) {
    return this.usersService.getMyDataUser(user);
  }

  @Auth()
  @ApiOperation({
    summary: 'Actualizar mi perfil',
    description:
      'Actualiza nombres, correo y teléfono propios; ignora role, password y posPin. Limitación actual: PATCH /users/:id captura /users/me y devuelve 400 para OWNER y 403 para MANAGER/CASHIER antes de ejecutar este método. Autenticación Bearer JWT. Roles: OWNER, MANAGER, CASHIER.',
    operationId: 'users_updateMyData',
  })
  @ApiConsumes('application/json')
  @ApiBody({ type: UpdateUserDto, required: true })
  @ApiErrors({
    '400':
      'Parámetros o cuerpo inválidos, propiedades no permitidas o regla de negocio incumplida.',
    '404': 'Registro requerido no encontrado durante la escritura.',
  })
  @ApiResponse({
    status: 200,
    description: 'Operación completada.',
    type: UserResponse,
  })
  @ApiErrors({ 403: 'La ruta dinámica previa requiere OWNER.' })
  @Patch('me')
  updateMyData(@Body() updateUserDto: UpdateUserDto, @GetUser() user: User) {
    return this.usersService.updateProfile(updateUserDto, user);
  }

  @Auth()
  @ApiOperation({
    summary: 'Cambiar mi contraseña',
    description:
      'Comprueba la contraseña actual y exige una nueva distinta con al menos seis caracteres. Devuelve el usuario sin credenciales. Autenticación Bearer JWT. Roles: OWNER, MANAGER, CASHIER.',
    operationId: 'users_changePassword',
  })
  @ApiConsumes('application/json')
  @ApiBody({ type: ChangePasswordDto, required: true })
  @ApiErrors({
    '400':
      'Parámetros o cuerpo inválidos, propiedades no permitidas o regla de negocio incumplida.',
    '404': 'Registro requerido no encontrado durante la escritura.',
  })
  @ApiResponse({
    status: 200,
    description: 'Operación completada.',
    type: StaffUser,
  })
  @Patch('me/password')
  changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @GetUser() user: User,
  ) {
    return this.usersService.changePassword(changePasswordDto, user);
  }
}
