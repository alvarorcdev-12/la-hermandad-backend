import { ApiResponse } from '@nestjs/swagger';
import { ref } from '../common/openapi/schemas.js';
import { ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from '../common/openapi/api-endpoint.decorator.js';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { CustomersService } from './customers.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { Auth } from '../auth/decorators/auth.decorator.js';
import { GetUser } from '../auth/decorators/get-user.decorator.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Auth()
  @ApiEndpoint(
    'Crear cliente',
    'Crea un registro asociado a la tienda del usuario autenticado. Devuelve el registro persistido con storeId y updatedAt, sin agregados calculados. Roles permitidos: OWNER, MANAGER, CASHIER.',
    'CustomerRecord',
    201,
    [],
    [409],
  )
  create(
    @Body() createCustomerDto: CreateCustomerDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.customersService.create(createCustomerDto, storeId);
  }

  @Get()
  @Auth()
  @ApiEndpoint(
    'Listar clientes',
    'Listado paginado por tienda. Busca por nombre, apellido, teléfono o correo. Orden predeterminado createdAt desc. Incluye numberOfOrders, amountSpent (suma de totales de todos sus pedidos) y canDelete. Roles permitidos: OWNER, MANAGER, CASHIER.',
    'CustomerPage',
    200,
    [],
    [],
  )
  findAll(
    @Query() paginationDto: PaginationDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.customersService.findAll(paginationDto, storeId);
  }

  @Get(':id')
  @Auth()
  @ApiEndpoint(
    'Consultar cliente',
    'Obtiene el registro identificado por UUID dentro de la tienda del usuario. Incluye numberOfOrders, amountSpent (suma de totales de todos sus pedidos) y canDelete. Roles permitidos: OWNER, MANAGER, CASHIER.',
    'Customer',
    200,
    ['id'],
    [404],
  )
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.customersService.findOne(id, storeId);
  }

  @Patch(':id')
  @Auth()
  @ApiEndpoint(
    'Actualizar cliente',
    'Actualización parcial: las propiedades omitidas conservan su valor. Devuelve el registro persistido con storeId y updatedAt, sin agregados calculados. Roles permitidos: OWNER, MANAGER, CASHIER.',
    'CustomerRecord',
    200,
    ['id'],
    [404, 409],
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, storeId, updateCustomerDto);
  }

  @Delete(':id')
  @Auth('OWNER', 'MANAGER')
  @ApiEndpoint(
    'Eliminar cliente',
    'Elimina el registro y devuelve sus datos. Las relaciones existentes pueden impedir la eliminación. Devuelve el registro persistido con storeId y updatedAt, sin agregados calculados. Si tiene pedidos devuelve 403. Roles permitidos: OWNER, MANAGER.',
    'CustomerRecord',
    200,
    ['id'],
    [404, 409],
  )
  @ApiResponse({
    status: 403,
    description: 'Cliente con pedidos asociados: no se puede eliminar.',
    schema: ref('Error'),
  })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.customersService.remove(id, storeId);
  }
}
