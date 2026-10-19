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
import { Customer } from './entities/customer.entity.js';
import { CustomerRecordResponseDto } from '../common/openapi/response.dto.js';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { CustomersService } from './customers.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';

import { Auth } from '../auth/decorators/auth.decorator.js';
import { GetUser } from '../auth/decorators/get-user.decorator.js';

@ApiTags('Clientes')
@ApiProduces('application/json')
@ApiErrors({ 500: 'Error interno o fallo de acceso a los datos.' })
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Auth('OWNER', 'MANAGER', 'CASHIER')
  @ApiOperation({
    summary: 'Crear clientes',
    description:
      'Opera sobre datos de la tienda del usuario autenticado. Autenticación Bearer JWT. Roles: OWNER, MANAGER, CASHIER.',
    operationId: 'customers_create',
  })
  @ApiConsumes('application/json')
  @ApiBody({ type: CreateCustomerDto, required: true })
  @ApiErrors({
    '400':
      'Parámetros o cuerpo inválidos, propiedades no permitidas o regla de negocio incumplida.',
    '409': 'Conflicto de unicidad en los datos.',
  })
  @ApiResponse({
    status: 201,
    description: 'Operación completada.',
    type: Customer,
  })
  @Post()
  create(
    @Body() createCustomerDto: CreateCustomerDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.customersService.create(createCustomerDto, storeId);
  }

  @Auth('OWNER', 'MANAGER', 'CASHIER')
  @ApiOperation({
    summary: 'Listar clientes',
    description:
      'Opera sobre datos de la tienda del usuario autenticado. Paginación con meta y results; page=1 y limit=10 por defecto. Orden por createdAt, asc en usuarios y desc en los demás módulos. Búsqueda q por nombres, apellidos, correo o teléfono. Autenticación Bearer JWT. Roles: OWNER, MANAGER, CASHIER.',
    operationId: 'customers_findAll',
  })
  @ApiErrors({
    '400':
      'Parámetros o cuerpo inválidos, propiedades no permitidas o regla de negocio incumplida.',
  })
  @ApiPage(Customer)
  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.customersService.findAll(paginationDto, storeId);
  }

  @Auth('OWNER', 'MANAGER', 'CASHIER')
  @ApiOperation({
    summary: 'Consultar clientes',
    description:
      'Opera sobre datos de la tienda del usuario autenticado. Autenticación Bearer JWT. Roles: OWNER, MANAGER, CASHIER.',
    operationId: 'customers_findOne',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador del recurso.',
    type: 'string',
    format: 'uuid',
  })
  @ApiErrors({
    '400':
      'Parámetros o cuerpo inválidos, propiedades no permitidas o regla de negocio incumplida.',
    '404': 'Recurso no encontrado en la tienda autenticada.',
  })
  @ApiResponse({
    status: 200,
    description: 'Operación completada.',
    type: Customer,
  })
  @Get(':id')
  findOne(@Param('id') id: string, @GetUser('storeId') storeId: string) {
    return this.customersService.findOne(id, storeId);
  }

  @Auth('OWNER', 'MANAGER', 'CASHIER')
  @ApiOperation({
    summary: 'Actualizar clientes',
    description:
      'Actualiza el cliente de la tienda. Devuelve campos persistidos, incluidos storeId y updatedAt, sin métricas del mapper. Autenticación Bearer JWT. Roles: OWNER, MANAGER, CASHIER.',
    operationId: 'customers_update',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador del recurso.',
    type: 'string',
    format: 'uuid',
  })
  @ApiConsumes('application/json')
  @ApiBody({ type: UpdateCustomerDto, required: true })
  @ApiErrors({
    '400':
      'Parámetros o cuerpo inválidos, propiedades no permitidas o regla de negocio incumplida.',
    '404': 'Recurso no encontrado en la tienda autenticada.',
    '409': 'Conflicto de unicidad en los datos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Operación completada.',
    type: CustomerRecordResponseDto,
  })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.customersService.update(id, storeId, updateCustomerDto);
  }

  @Auth('OWNER', 'MANAGER')
  @ApiOperation({
    summary: 'Eliminar clientes',
    description:
      'Elimina un cliente de la tienda solo si no tiene pedidos; en caso contrario devuelve 403. Devuelve los campos persistidos, no el mapper del listado. Autenticación Bearer JWT. Roles: OWNER, MANAGER.',
    operationId: 'customers_remove',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador del recurso.',
    type: 'string',
    format: 'uuid',
  })
  @ApiErrors({
    '400':
      'Parámetros o cuerpo inválidos, propiedades no permitidas o regla de negocio incumplida.',
    '404': 'Recurso no encontrado en la tienda autenticada.',
    '403': 'Rol no autorizado o cliente con pedidos asociados.',
  })
  @ApiResponse({
    status: 200,
    description: 'Operación completada.',
    type: CustomerRecordResponseDto,
  })
  @Delete(':id')
  remove(@Param('id') id: string, @GetUser('storeId') storeId: string) {
    return this.customersService.remove(id, storeId);
  }
}
