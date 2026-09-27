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

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Auth('OWNER', 'CASHIER', 'MANAGER')
  create(@Body() createOrderDto: CreateOrderDto, @GetUser() user: User) {
    return this.ordersService.create(createOrderDto, user);
  }

  @Get()
  @Auth('OWNER', 'CASHIER', 'MANAGER')
  findAll(
    @Query() orderPaginationDto: OrdersPaginationDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.ordersService.findAll(orderPaginationDto, storeId);
  }

  @Get('stats')
  @Auth('OWNER', 'CASHIER', 'MANAGER')
  getOrderStats(
    @Query() orderStatsDto: OrderStatsDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.ordersService.getOrderStats(storeId, orderStatsDto);
  }

  @Get(':id')
  @Auth('OWNER', 'CASHIER', 'MANAGER')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.ordersService.findOne(id, storeId);
  }

  @Patch(':id')
  @Auth('OWNER', 'CASHIER', 'MANAGER')
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
  addItems(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
    @Body() addItemsDto: AddItemsDto,
  ) {
    return this.ordersService.addItems(id, storeId, addItemsDto);
  }

  @Patch(':id/items/:itemId')
  @Auth('OWNER', 'CASHIER', 'MANAGER')
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
  open(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.ordersService.orderOpen(id, storeId);
  }

  @Post(':id/close')
  @Auth('OWNER', 'CASHIER', 'MANAGER')
  close(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.ordersService.orderClose(id, storeId);
  }

  @Post(':id/cancel')
  @Auth('OWNER', 'CASHIER', 'MANAGER')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
    @Body() cancelOrderDto: CancelOrderDto,
  ) {
    return this.ordersService.orderCancel(id, storeId, cancelOrderDto);
  }

  @Post(':id/payment')
  @Auth('OWNER', 'CASHIER', 'MANAGER')
  addPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    return this.ordersService.addPayment(id, storeId, createPaymentDto);
  }
}
