import * as bcrypt from 'bcrypt';
import type {
  CategoryCreateInput,
  CustomerCreateManyInput,
  ProductCreateManyInput,
  UserCreateInput,
} from '../../generated/prisma/models.js';

interface SeedData {
  user: UserCreateInput;
  category: (storeId: string) => CategoryCreateInput;
  products: (storeId: string, categoryId: string) => ProductCreateManyInput[];
  customers: (storeId: string) => CustomerCreateManyInput[];
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
  customers: (storeId: string) => {
    return [
      {
        firstName: 'Juan',
        lastName: 'Perez',
        email: 'juanperez@google.com',
        storeId,
      },
      {
        firstName: 'Roberto',
        lastName: 'Ruiz',
        email: 'robert@google.com',
        storeId,
      },
    ];
  },
};
