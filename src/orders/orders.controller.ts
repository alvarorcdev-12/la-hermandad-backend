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

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Auth('OWNER', 'CASHIER', 'MANAGER')
  @Post()
  create(@Body() createOrderDto: CreateOrderDto, @GetUser() user: User) {
    return this.ordersService.create(createOrderDto, user);
  }

  @Auth('OWNER', 'CASHIER', 'MANAGER')
  @Get()
  findAll(
    @Query() orderPaginationDto: OrdersPaginationDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.ordersService.findAll(orderPaginationDto, storeId);
  }

  @Auth('OWNER')
  @Get('stats')
  getOrderStats(
    @Query() orderStatsDto: OrderStatsDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.ordersService.getOrderStats(storeId, orderStatsDto);
  }

  @Auth('OWNER', 'CASHIER', 'MANAGER')
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.ordersService.findOne(id, storeId);
  }

  @Auth('OWNER', 'CASHIER', 'MANAGER')
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
  @Post(':id/items')
  addItems(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
    @Body() addItemsDto: AddItemsDto,
  ) {
    return this.ordersService.addItems(id, storeId, addItemsDto);
  }

  @Auth('OWNER', 'CASHIER', 'MANAGER')
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
  @Post(':id/open')
  open(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.ordersService.orderOpen(id, storeId);
  }

  @Auth('OWNER', 'CASHIER', 'MANAGER')
  @Post(':id/close')
  close(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.ordersService.orderClose(id, storeId);
  }

  @Auth('OWNER', 'CASHIER', 'MANAGER')
  @Post(':id/cancel')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
    @Body() cancelOrderDto: CancelOrderDto,
  ) {
    return this.ordersService.orderCancel(id, storeId, cancelOrderDto);
  }

  @Auth('OWNER', 'CASHIER', 'MANAGER')
  @Post(':id/payment')
  addPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    return this.ordersService.addPayment(id, storeId, createPaymentDto);
  }
}
