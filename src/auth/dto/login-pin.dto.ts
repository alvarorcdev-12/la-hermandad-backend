import { IsUUID, Matches } from 'class-validator';
import {
  POS_PIN_MESSAGE,
  POS_PIN_PATTERN,
} from '../../users/pos-pin/pos-pin.validation.js';

export class LoginPinDto {
  @IsUUID('4', { message: 'La tienda debe ser un UUID válido.' })
  storeId: string;

  @Matches(POS_PIN_PATTERN, { message: POS_PIN_MESSAGE })
  posPin: string;
}
