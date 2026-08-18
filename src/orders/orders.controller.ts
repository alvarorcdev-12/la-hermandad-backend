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
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrdersPaginationDto } from './dto/orders-pagination.dto';
import { AddItemsDto } from './dto/add-items.dto';

import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { Auth } from 'src/auth/decorators/auth.decorator';

import type { User } from 'src/generated/prisma/client';

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
  ) {
    return this.ordersService.orderCancel(id, storeId);
  }

  @Delete(':id')
  @Auth('OWNER', 'CASHIER', 'MANAGER')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('storeId') storeId: string,
  ) {
    return this.ordersService.remove(id, storeId);
  }
}
