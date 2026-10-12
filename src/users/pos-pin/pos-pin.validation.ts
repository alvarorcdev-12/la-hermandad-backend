export const POS_PIN_PATTERN =
  /^(?!([0-9])\1{5}$)(?!123456$|654321$|000111$)[0-9]{6}$/;
export const POS_PIN_MESSAGE =
  'El PIN debe contener exactamente seis dígitos y no puede ser un patrón trivial.';
