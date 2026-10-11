import * as bcrypt from 'bcrypt';
import type { UserCreateInput } from '../../generated/prisma/models.js';

interface SeedData {
  user: UserCreateInput;
}

export const initialData: SeedData = {
  user: {
    firstName: 'Alvaro',
    lastName: 'Ruiz Catoira',
    email: 'alvaro@google.com',
    password: bcrypt.hashSync('123456', 10),
    role: 'OWNER',
    isShopOwner: true,
    store: {
      create: {
        name: 'La Hermandad',
        settings: {
          create: {},
        },
        locations: {
          create: {
            name: 'Sucursal de la tienda',
            isDefault: true,
          },
        },
      },
    },
  },
};
