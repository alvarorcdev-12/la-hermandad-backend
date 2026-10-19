import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, Matches } from 'class-validator';
import {
  POS_PIN_MESSAGE,
  POS_PIN_PATTERN,
} from '../../users/pos-pin/pos-pin.validation.js';

export class LoginPinDto {
  @IsUUID('4', { message: 'La tienda debe ser un UUID válido.' })
  @ApiProperty({
    description: 'Identificador de la tienda.',
    format: 'uuid',
    type: String,
  })
  storeId: string;

  @Matches(POS_PIN_PATTERN, { message: POS_PIN_MESSAGE })
  @ApiProperty({
    description:
      'PIN POS de seis dígitos; no se admiten patrones triviales. Obligatorio al crear un CASHIER.',
    writeOnly: true,
    format: 'password',
    pattern: '^(?!([0-9])\\1{5}$)(?!123456$|654321$|000111$)[0-9]{6}$',
    minLength: 6,
    maxLength: 6,
    type: String,
  })
  posPin: string;
}
