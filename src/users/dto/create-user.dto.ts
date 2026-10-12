import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
  Matches,
  ValidateIf,
} from 'class-validator';
import {
  POS_PIN_MESSAGE,
  POS_PIN_PATTERN,
} from '../pos-pin/pos-pin.validation.js';
import { Role } from '../../generated/prisma/enums.js';

export class CreateUserDto {
  @IsString()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsPhoneNumber()
  @IsOptional()
  phone?: string;

  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @IsEnum(Role)
  role: Role;

  // POS
  @ValidateIf(
    (user: CreateUserDto) =>
      user.role === Role.CASHIER || user.posPin !== undefined,
  )
  @Matches(POS_PIN_PATTERN, { message: POS_PIN_MESSAGE })
  posPin?: string;
}
