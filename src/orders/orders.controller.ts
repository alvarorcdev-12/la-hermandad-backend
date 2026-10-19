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
import { Order } from './entities/order.entity.js';
import {
  PaymentResponseDto,
  OrderStatsResponseDto,
} from '../common/openapi/response.dto.js';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service.js';

import { AddItemsDto } from './dto/add-items.dto.js';
import { CancelOrderDto } from './dto/cancel-order.dto.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { EditItemQuantityDto } from './dto/edit-item-quantity.dto.js';
import { OrdersPaginationDto } from './dto/orders-pagination.dto.js';
import { OrderStatsDto } from './dto/order-stats.dto.js';
import { UpdateOrderDto } from './dto/update-order.dto.js';

import { GetUser } from '../auth/decorators/get-user.decorator.js';
import { Auth } from '../auth/decorators/auth.decorator.js';

import type { User } from '../generated/prisma/client.js';

@ApiTags('Pedidos')
@ApiProduces('application/json')
@ApiErrors({ 500: 'Error interno o fallo de acceso a los datos.' })
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Auth('OWNER', 'CASHIER', 'MANAGER')
  @ApiOperation({
    summary: 'Crear pedidos',
    description:
      'Crea un pedido OPEN/PENDING, asigna número y ubicación predeterminada activa. Productos activos y cliente deben pertenecer a la tienda. Descuenta inventario controlado y conserva precios históricos. Cantidades enteras positivas; total positivo, descuento menor que subtotal y montos de hasta 9999999999.99 con dos decimales. Autenticación Bearer JWT. Roles: OWNER, CASHIER, MANAGER.',
    operationId: 'orders_create',
  })
  @ApiConsumes('application/json')
  @ApiBody({ type: CreateOrderDto, required: true })
  @ApiErrors({
    '400':
      'Parámetros o cuerpo inválidos, propiedades no permitidas o regla de negocio incumplida.',
    '409': 'Conflicto de unicidad en los datos.',
    '404': 'Configuración de numeración de la tienda no encontrada.',
  })
  @ApiResponse({
    status: 201,
    description: 'Operación completada.',
    type: Order,
  })
  @Post()
  create(@Body() createOrderDto: CreateOrderDto, @GetUser() user: User) {
    return this.ordersService.create(createOrderDto, user);
  }

  @Auth('OWNER', 'CASHIER', 'MANAGER')
  @ApiOperation({
    summary: 'Listar pedidos',
    description:
      'Busca por nombre del pedido o nombres, correo y teléfono del cliente; filtra por estado. startDate y endDate se validan pero actualmente NO filtran resultados. Paginación con meta y results; page=1 y limit=10 por defecto. Orden por createdAt, asc en usuarios y desc en los demás módulos. Autenticación Bearer JWT. Roles: OWNER, CASHIER, MANAGER.',
    operationId: 'orders_findAll',
  })
  @ApiErrors({
    '400':
      'Parámetros o cuerpo inválidos, propiedades no permitidas o regla de negocio incumplida.',
  })
  @ApiPage(Order)
  @Get()
  findAll(
    @Query() orderPaginationDto: OrdersPaginationDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.ordersService.findAll(orderPaginationDto, storeId);
  }

  @Auth('OWNER')
  @ApiOperation({
    summary: 'Consultar estadísticas de pedidos',
    description:
      'Filtra por createdAt. Sin fechas usa el día actual según la zona horaria del servidor; los extremos se ajustan al inicio y fin del día. orders, sales e items excluyen cancelados. sales suma totales de pedidos, no cobros. Autenticación Bearer JWT. Roles: OWNER.',
    operationId: 'orders_getOrderStats',
  })
  @ApiErrors({
    '400':
      'Parámetros o cuerpo inválidos, propiedades no permitidas o regla de negocio incumplida.',
  })
  @ApiResponse({
    status: 200,
    description: 'Operación completada.',
    type: OrderStatsResponseDto,
  })
  @Get('stats')
  getOrderStats(
    @Query() orderStatsDto: OrderStatsDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.ordersService.getOrderStats(storeId, orderStatsDto);
  }

  @Auth('OWNER', 'CASHIER', 'MANAGER')
  @ApiOperation({
    summary: 'Consultar pedidos',
    description:
      'Opera sobre datos de la tienda del usuario autenticado. Autenticación Bearer JWT. Roles: OWNER, CASHIER, MANAGER.',
    operationId: 'orders_findOne',
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
    type: Order,
  })
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.ordersService.findOne(id, storeId);
  }

  @Auth('OWNER', 'CASHIER', 'MANAGER')
  @ApiOperation({
    summary: 'Actualizar pedidos',
    description:
      'Actualiza contacto, nota, cliente y descuento. Cambiar descuento o su motivo exige pedido OPEN/PENDING sin pagos. items es aceptado y validado pero ignorado. discountAmount omitido conserva su valor; null se rechaza. Descuento cero limpia el motivo. customerId null desvincula el cliente. Autenticación Bearer JWT. Roles: OWNER, CASHIER, MANAGER.',
    operationId: 'orders_update',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador del recurso.',
    type: 'string',
    format: 'uuid',
  })
  @ApiConsumes('application/json')
  @ApiBody({ type: UpdateOrderDto, required: true })
  @ApiErrors({
    '400':
      'Parámetros o cuerpo inválidos, propiedades no permitidas o regla de negocio incumplida.',
    '404': 'Recurso no encontrado en la tienda autenticada.',
  })
  @ApiResponse({
    status: 200,
    description: 'Operación completada.',
    type: Order,
  })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.ordersService.update(id, updateOrderDto, storeId);
  }

  // Items
  @Auth('OWNER', 'CASHIER', 'MANAGER')
  @ApiOperation({
    summary: 'Agregar artículos al pedido',
    description:
      'Agrega una unidad por entrada a un pedido OPEN/PENDING sin pagos. Productos activos de la misma tienda; valida existencias y recalcula totales conservando el descuento. Autenticación Bearer JWT. Roles: OWNER, CASHIER, MANAGER.',
    operationId: 'orders_addItems',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador del recurso.',
    type: 'string',
    format: 'uuid',
  })
  @ApiConsumes('application/json')
  @ApiBody({ type: AddItemsDto, required: true })
  @ApiErrors({
    '400':
      'Parámetros o cuerpo inválidos, propiedades no permitidas o regla de negocio incumplida.',
    '404': 'Recurso no encontrado en la tienda autenticada.',
  })
  @ApiResponse({
    status: 201,
    description: 'Operación completada.',
    type: Order,
  })
  @Post(':id/items')
  addItems(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
    @Body() addItemsDto: AddItemsDto,
  ) {
    return this.ordersService.addItems(id, storeId, addItemsDto);
  }

  @Auth('OWNER', 'CASHIER', 'MANAGER')
  @ApiOperation({
    summary: 'Cambiar cantidad de un artículo',
    description:
      'Exige pedido OPEN/PENDING sin pagos y cantidad entera entre 0 y 2147483647. Cero oculta el artículo de la respuesta; debe quedar un pedido con unidades y total positivo. Al reducir cantidad solo repone stock si restock es true. Conserva el precio histórico. Autenticación Bearer JWT. Roles: OWNER, CASHIER, MANAGER.',
    operationId: 'orders_editItemQuantity',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador del recurso.',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'itemId',
    description: 'Identificador del artículo.',
    type: 'string',
    format: 'uuid',
  })
  @ApiConsumes('application/json')
  @ApiBody({ type: EditItemQuantityDto, required: true })
  @ApiErrors({
    '400':
      'Parámetros o cuerpo inválidos, propiedades no permitidas o regla de negocio incumplida.',
    '404': 'Recurso no encontrado en la tienda autenticada.',
  })
  @ApiResponse({
    status: 200,
    description: 'Operación completada.',
    type: Order,
  })
  @Patch(':id/items/:itemId')
  editItemQuantity(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() editItemQuantityDto: EditItemQuantityDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.ordersService.editItemQuantity(
      id,
      itemId,
      editItemQuantityDto,
      storeId,
    );
  }

  @Auth('OWNER', 'CASHIER', 'MANAGER')
  @ApiOperation({
    summary: 'Intentar reabrir un pedido',
    description:
      'Operación sin resultado exitoso: un pedido existente siempre devuelve 400 porque no se permite reabrir; uno inexistente devuelve 404. Autenticación Bearer JWT. Roles: OWNER, CASHIER, MANAGER.',
    operationId: 'orders_open',
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
  @Post(':id/open')
  open(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.ordersService.orderOpen(id, storeId);
  }

  @Auth('OWNER', 'CASHIER', 'MANAGER')
  @ApiOperation({
    summary: 'Cerrar un pedido pagado',
    description:
      'Solo admite pedidos totalmente pagados, con suma de pagos igual al total y paidAt informado. Si ya está cerrado coherentemente devuelve su estado actual. Autenticación Bearer JWT. Roles: OWNER, CASHIER, MANAGER.',
    operationId: 'orders_close',
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
    status: 201,
    description: 'Operación completada.',
    type: Order,
  })
  @Post(':id/close')
  close(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.ordersService.orderClose(id, storeId);
  }

  @Auth('OWNER', 'CASHIER', 'MANAGER')
  @ApiOperation({
    summary: 'Cancelar un pedido',
    description:
      'Solo cancela pedidos OPEN/PENDING sin pagos. Si ya está cancelado devuelve su estado actual. Siempre repone existencias controladas: restock se ignora. Deja estado CANCELLED/VOIDED. Autenticación Bearer JWT. Roles: OWNER, CASHIER, MANAGER.',
    operationId: 'orders_cancel',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador del recurso.',
    type: 'string',
    format: 'uuid',
  })
  @ApiConsumes('application/json')
  @ApiBody({ type: CancelOrderDto, required: true })
  @ApiErrors({
    '400':
      'Parámetros o cuerpo inválidos, propiedades no permitidas o regla de negocio incumplida.',
    '404': 'Recurso no encontrado en la tienda autenticada.',
  })
  @ApiResponse({
    status: 201,
    description: 'Operación completada.',
    type: Order,
  })
  @Post(':id/cancel')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
    @Body() cancelOrderDto: CancelOrderDto,
  ) {
    return this.ordersService.orderCancel(id, storeId, cancelOrderDto);
  }

  @Auth('OWNER', 'CASHIER', 'MANAGER')
  @ApiOperation({
    summary: 'Registrar un pago',
    description:
      'Admite pedidos OPEN con estado PENDING o PARTIALLY_PAID. El importe no puede exceder el saldo. Al completar el pago cierra el pedido y establece PAID. No dispone de clave de idempotencia: repetir la solicitud puede registrar otro pago. Autenticación Bearer JWT. Roles: OWNER, CASHIER, MANAGER.',
    operationId: 'orders_addPayment',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador del recurso.',
    type: 'string',
    format: 'uuid',
  })
  @ApiConsumes('application/json')
  @ApiBody({ type: CreatePaymentDto, required: true })
  @ApiErrors({
    '400':
      'Parámetros o cuerpo inválidos, propiedades no permitidas o regla de negocio incumplida.',
    '404': 'Recurso no encontrado en la tienda autenticada.',
  })
  @ApiResponse({
    status: 201,
    description: 'Operación completada.',
    type: PaymentResponseDto,
  })
  @Post(':id/payment')
  addPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    return this.ordersService.addPayment(id, storeId, createPaymentDto);
  }
}
