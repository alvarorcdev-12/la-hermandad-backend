import { ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from '../common/openapi/api-endpoint.decorator.js';
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
import { CreateOrderDto } from './dto/create-order.dto.js';
import { UpdateOrderDto } from './dto/update-order.dto.js';
import { OrdersPaginationDto } from './dto/orders-pagination.dto.js';
import { AddItemsDto } from './dto/add-items.dto.js';
import { EditItemQuantityDto } from './dto/edit-item-quantity.dto.js';
import { CancelOrderDto } from './dto/cancel-order.dto.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';

import { GetUser } from '../auth/decorators/get-user.decorator.js';
import { Auth } from '../auth/decorators/auth.decorator.js';

import type { User } from '../generated/prisma/client.js';
import { OrderStatsDto } from './dto/order-stats.dto.js';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Auth('OWNER', 'CASHIER', 'MANAGER')
  @ApiEndpoint(
    'Crear pedido',
    'Crea un pedido OPEN/PENDING con numeración de tienda y precios actuales de productos. Descuenta inventario controlado; stock insuficiente o producto inexistente produce 400. Usa la ubicación activa predeterminada. Roles permitidos: OWNER, CASHIER, MANAGER.',
    'Order',
    201,
    [],
    [409],
  )
  create(@Body() createOrderDto: CreateOrderDto, @GetUser() user: User) {
    return this.ordersService.create(createOrderDto, user);
  }

  @Get()
  @Auth('OWNER', 'CASHIER', 'MANAGER')
  @ApiEndpoint(
    'Listar pedidos',
    'Busca por nombre del pedido y nombre, apellido, correo o teléfono del cliente. Filtra por status. startDate y endDate se validan pero actualmente NO se aplican al listado. Orden predeterminado createdAt desc. Roles permitidos: OWNER, CASHIER, MANAGER.',
    'OrderPage',
    200,
    [],
    [],
  )
  findAll(
    @Query() orderPaginationDto: OrdersPaginationDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.ordersService.findAll(orderPaginationDto, storeId);
  }

  @Get('stats')
  @Auth('OWNER')
  @ApiEndpoint(
    'Consultar estadísticas de pedidos',
    'Filtra por fecha de creación e incluye los extremos del día según la zona horaria del servidor. Sin fechas usa el día actual; con un solo extremo queda abierto el otro. orders, sales e items excluyen cancelados; cancelledOrders los cuenta aparte. sales suma totales de pedidos, no pagos cobrados. Roles permitidos: OWNER, CASHIER, MANAGER.',
    'OrderStats',
    200,
    [],
    [],
  )
  getOrderStats(
    @Query() orderStatsDto: OrderStatsDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.ordersService.getOrderStats(storeId, orderStatsDto);
  }

  @Get(':id')
  @Auth('OWNER', 'CASHIER', 'MANAGER')
  @ApiEndpoint(
    'Consultar pedido',
    'Obtiene el registro identificado por UUID dentro de la tienda del usuario. Roles permitidos: OWNER, CASHIER, MANAGER.',
    'Order',
    200,
    ['id'],
    [404],
  )
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.ordersService.findOne(id, storeId);
  }

  @Patch(':id')
  @Auth('OWNER', 'CASHIER', 'MANAGER')
  @ApiEndpoint(
    'Actualizar datos del pedido',
    'Actualiza customerId, email, phone y note. items es aceptado y validado, pero ignorado: use las rutas de artículos. No comprueba el estado del pedido. Roles permitidos: OWNER, CASHIER, MANAGER.',
    'Order',
    200,
    ['id'],
    [404, 409],
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.ordersService.update(id, updateOrderDto, storeId);
  }

  // Items
  @Post(':id/items')
  @Auth('OWNER', 'CASHIER', 'MANAGER')
  @ApiEndpoint(
    'Agregar artículos',
    'Requiere pedido OPEN. Agrega una línea con cantidad 1 por cada productId, descuenta inventario controlado y recalcula totales. No fusiona líneas existentes. Roles permitidos: OWNER, CASHIER, MANAGER.',
    'Order',
    201,
    ['id'],
    [404],
  )
  addItems(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
    @Body() addItemsDto: AddItemsDto,
  ) {
    return this.ordersService.addItems(id, storeId, addItemsDto);
  }

  @Patch(':id/items/:itemId')
  @Auth('OWNER', 'CASHIER', 'MANAGER')
  @ApiEndpoint(
    'Cambiar cantidad de un artículo',
    'Requiere pedido OPEN. quantity es la nueva cantidad absoluta; cero retira el artículo de la respuesta. Aumentar descuenta stock; reducir solo repone si restock=true (predeterminado false). Recalcula totales. Un itemId inexistente puede producir 500 por Prisma no interceptado. Roles permitidos: OWNER, CASHIER, MANAGER.',
    'Order',
    200,
    ['id', 'itemId'],
    [404],
  )
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

  @Post(':id/open')
  @Auth('OWNER', 'CASHIER', 'MANAGER')
  @ApiEndpoint(
    'Reabrir pedido',
    'Solo admite pedidos CLOSED cuyo estado financiero no sea VOIDED. Cambia a OPEN y elimina closedAt. Roles permitidos: OWNER, CASHIER, MANAGER.',
    'Order',
    201,
    ['id'],
    [404],
  )
  open(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.ordersService.orderOpen(id, storeId);
  }

  @Post(':id/close')
  @Auth('OWNER', 'CASHIER', 'MANAGER')
  @ApiEndpoint(
    'Cerrar pedido',
    'Requiere OPEN y estado financiero distinto de PENDING y PARTIALLY_PAID. Cambia a CLOSED y fija closedAt. Roles permitidos: OWNER, CASHIER, MANAGER.',
    'Order',
    201,
    ['id'],
    [404, 409],
  )
  close(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.ordersService.orderClose(id, storeId);
  }

  @Post(':id/cancel')
  @Auth('OWNER', 'CASHIER', 'MANAGER')
  @ApiEndpoint(
    'Cancelar pedido',
    'Rechaza CLOSED; si ya está CANCELLED devuelve el pedido sin repetir efectos. Marca CANCELLED/VOIDED y registra motivo y fecha. Actualmente siempre repone inventario controlado aunque restock=false. No crea reembolsos. Roles permitidos: OWNER, CASHIER, MANAGER.',
    'Order',
    201,
    ['id'],
    [404],
  )
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
    @Body() cancelOrderDto: CancelOrderDto,
  ) {
    return this.ordersService.orderCancel(id, storeId, cancelOrderDto);
  }

  @Post(':id/payment')
  @Auth('OWNER', 'CASHIER', 'MANAGER')
  @ApiEndpoint(
    'Registrar pago',
    'Requiere pedido abierto y no totalmente pagado. Crea pago y recalcula estado financiero (PARTIALLY_PAID o PAID). Admite un importe superior al saldo; no genera cambio ni reembolso. Devuelve el pago, no el pedido. Pedido inexistente puede producir 500 por Prisma no interceptado. Roles permitidos: OWNER, CASHIER, MANAGER.',
    'Payment',
    201,
    ['id'],
    [],
  )
  addPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    return this.ordersService.addPayment(id, storeId, createPaymentDto);
  }
}
