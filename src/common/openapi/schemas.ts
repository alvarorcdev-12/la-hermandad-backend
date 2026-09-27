import type { SchemaObject, ReferenceObject } from '@nestjs/swagger';

const string = (description: string, example = 'Ejemplo'): SchemaObject => ({
  type: 'string',
  description,
  example,
});
const uuid: SchemaObject = {
  type: 'string',
  format: 'uuid',
  example: '123e4567-e89b-42d3-a456-426614174000',
};
const date: SchemaObject = {
  type: 'string',
  format: 'date-time',
  example: '2026-09-27T12:00:00.000Z',
};
const number: SchemaObject = { type: 'integer', example: 1 };
const boolean: SchemaObject = { type: 'boolean', example: true };
const decimal: SchemaObject = {
  type: 'string',
  description:
    'Decimal de Prisma serializado como cadena JSON; no garantiza ceros finales.',
  example: '25.5',
};
const nullable = (schema: SchemaObject): SchemaObject => ({
  ...schema,
  nullable: true,
});
const object = (
  properties: Record<string, SchemaObject | ReferenceObject>,
): SchemaObject => ({
  type: 'object',
  required: Object.keys(properties),
  properties,
});
const enumeration = (...values: string[]): SchemaObject => ({
  type: 'string',
  enum: values,
  example: values[0],
});
export const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const person = {
  id: uuid,
  firstName: string('Nombre', 'Álvaro'),
  lastName: nullable(string('Apellidos', 'Pérez')),
  email: nullable({
    type: 'string',
    format: 'email',
    example: 'alvaro@example.com',
  }),
  phone: nullable(string('Teléfono internacional', '+59171234567')),
  createdAt: date,
};
const customer = {
  ...person,
  storeId: uuid,
  note: nullable(string('Nota')),
  updatedAt: date,
};
const category = {
  id: uuid,
  name: string('Nombre de categoría', 'Bebidas'),
  description: nullable(string('Descripción')),
  createdAt: date,
  updatedAt: date,
};
const staff = {
  ...person,
  name: string('Nombre completo', 'Álvaro Pérez'),
  initials: {
    type: 'array',
    items: { type: 'string' },
    example: ['Á', 'P'],
  } as SchemaObject,
  avatar: nullable(string('URL de avatar')),
  isShopOwner: boolean,
  isActive: boolean,
  role: enumeration('OWNER', 'MANAGER', 'CASHIER'),
};

/** Contratos de salida, basados en los mappers y en los registros devueltos por los servicios. */
export const responseSchemas: Record<string, SchemaObject> = {
  Error: {
    type: 'object',
    required: ['statusCode', 'message'],
    properties: {
      statusCode: { type: 'integer', example: 400 },
      message: {
        description: 'Mensaje del servicio o lista de errores de validación.',
        oneOf: [
          { type: 'string' },
          { type: 'array', items: { type: 'string' } },
        ],
        example: ['property unknown should not exist'],
      },
      error: string(
        'Nombre HTTP del error, cuando Nest lo incluye',
        'Bad Request',
      ),
    },
  },
  PaginationMeta: object({
    totalItems: number,
    currentPage: number,
    pageSize: { ...number, example: 10 },
    totalPages: number,
    hasNextPage: boolean,
    hasPreviousPage: { ...boolean, example: false },
  }),
  Category: object(category),
  DeletedCategory: object({ ...category, storeId: uuid }),
  CustomerRecord: object(customer),
  Customer: object({
    ...person,
    displayName: string('Nombre completo', 'Álvaro Pérez'),
    note: nullable(string('Nota')),
    amountSpent: decimal,
    numberOfOrders: number,
    canDelete: boolean,
  }),
  StaffUser: object(staff),
  AuthUser: object({
    ...staff,
    email: { type: 'string', format: 'email', example: 'alvaro@example.com' },
    storeName: string('Nombre de la tienda', 'La Hermandad'),
  }),
  AuthSession: object({
    token: string('JWT con vigencia de 24 horas', 'eyJhbGciOiJIUzI1NiJ9...'),
    user: ref('AuthUser'),
  }),
  Product: object({
    id: uuid,
    title: string('Nombre del producto', 'Café'),
    description: nullable(string('Descripción')),
    sku: nullable(string('SKU', 'CAF-001')),
    price: decimal,
    costPrice: nullable(decimal),
    compareAtPrice: nullable(decimal),
    trackInventory: boolean,
    inventoryQuantity: number,
    status: enumeration('DRAFT', 'ACTIVE', 'ARCHIVED'),
    category: nullable(
      object({ id: uuid, name: string('Categoría', 'Bebidas') }),
    ),
    createdAt: date,
    updatedAt: date,
  }),
  OrderItem: object({
    id: uuid,
    productId: uuid,
    title: string('Nombre al momento de la venta', 'Café'),
    quantity: number,
    unitPrice: decimal,
    totalPrice: decimal,
    sku: nullable(string('SKU', 'CAF-001')),
  }),
  Order: object({
    id: uuid,
    number: { ...number, example: 1001 },
    name: string('Número con prefijo y sufijo', '#1001'),
    itemCount: number,
    subtotalPrice: decimal,
    totalPrice: decimal,
    email: nullable(string('Correo electrónico', 'alvaro@example.com')),
    phone: nullable(string('Teléfono', '+59171234567')),
    note: nullable(string('Nota')),
    customer: nullable(object(customer)),
    financialStatus: enumeration(
      'PAID',
      'PARTIALLY_PAID',
      'PENDING',
      'REFUNDED',
      'PARTIALLY_REFUNDED',
      'VOIDED',
    ),
    status: enumeration('OPEN', 'CLOSED', 'CANCELLED'),
    cancelledAt: nullable(date),
    cancelReason: nullable(string('Motivo de cancelación')),
    closedAt: nullable(date),
    paidAt: nullable(date),
    createdAt: date,
    updateAt: {
      ...date,
      description: 'Nombre actual del campo: updateAt (sin d).',
    },
    items: {
      type: 'array',
      description: 'Solo artículos con cantidad mayor que cero.',
      items: ref('OrderItem'),
    },
  }),
  Payment: object({
    id: uuid,
    orderId: uuid,
    amount: decimal,
    method: enumeration('CASH', 'CARD', 'QR', 'BANK_TRANSFER'),
    reference: nullable(string('Referencia', 'REC-001')),
    note: nullable(string('Nota')),
    createdAt: date,
    updatedAt: date,
  }),
  OrderStats: object({
    orders: number,
    sales: decimal,
    items: number,
    closedOrders: number,
    cancelledOrders: number,
  }),
};

for (const name of ['Category', 'Customer', 'Product', 'StaffUser', 'Order']) {
  responseSchemas[`${name}Page`] = object({
    meta: ref('PaginationMeta'),
    results: { type: 'array', items: ref(name) },
  });
}
