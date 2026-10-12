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

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Auth('OWNER', 'MANAGER', 'CASHIER')
  @Post()
  create(
    @Body() createCustomerDto: CreateCustomerDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.customersService.create(createCustomerDto, storeId);
  }

  @Auth('OWNER', 'MANAGER', 'CASHIER')
  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.customersService.findAll(paginationDto, storeId);
  }

  @Auth('OWNER', 'MANAGER', 'CASHIER')
  @Get(':id')
  findOne(@Param('id') id: string, @GetUser('storeId') storeId: string) {
    return this.customersService.findOne(id, storeId);
  }

  @Auth('OWNER', 'MANAGER', 'CASHIER')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @GetUser('storeId') storeId: string,
  ) {
    return this.customersService.update(id, storeId, updateCustomerDto);
  }

  @Auth('OWNER', 'MANAGER')
  @Delete(':id')
  remove(@Param('id') id: string, @GetUser('storeId') storeId: string) {
    return this.customersService.remove(id, storeId);
  }
}
