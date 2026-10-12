import * as bcrypt from 'bcrypt';
import type {
  CategoryCreateInput,
  ProductCreateManyInput,
  UserCreateInput,
} from '../../generated/prisma/models.js';

interface SeedData {
  user: UserCreateInput;
  category: (storeId: string) => CategoryCreateInput;
  products: (storeId: string, categoryId: string) => ProductCreateManyInput[];
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
  category: (storeId: string) => ({
    name: 'Empanadas',
    store: { connect: { id: storeId } },
  }),
  products: (storeId: string, categoryId: string) => {
    return [
      {
        title: 'Empanada de carne',
        price: 5,
        trackInventory: true,
        inventoryQuantity: 250,
        storeId,
        categoryId,
      },
      {
        title: 'Empanada de pollo',
        price: 5,
        trackInventory: true,
        inventoryQuantity: 250,
        storeId,
        categoryId,
      },
    ];
  },
};
