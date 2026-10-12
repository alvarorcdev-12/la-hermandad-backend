import {
  IntersectionType,
  OmitType,
  PartialType,
  PickType,
} from '@nestjs/mapped-types';
import { CreateOrderDto } from './create-order.dto.js';

// Keep the amount optional without letting PartialType skip validation for null.
export class UpdateOrderDto extends IntersectionType(
  PartialType(OmitType(CreateOrderDto, ['discountAmount'] as const)),
  PickType(CreateOrderDto, ['discountAmount'] as const),
) {}
