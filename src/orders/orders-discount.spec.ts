import 'reflect-metadata';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  Decimal,
  PrismaClientKnownRequestError,
} from '@prisma/client/runtime/client';
import { ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import {
  Prisma,
  type Order,
  type OrderItem,
  type Product,
  type User,
} from '../generated/prisma/client.js';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { UpdateOrderDto } from './dto/update-order.dto.js';

const date = new Date('2026-01-01T00:00:00Z');
const storeId = '83ca14af-404f-4dbb-b15c-20e99311f371';
const productId = '024f8203-3d30-442e-8a86-c43b49565eb6';
const product: Product = {
  id: productId,
  storeId,
  title: 'Product',
  description: null,
  sku: null,
  price: new Decimal(15),
  costPrice: null,
  compareAtPrice: null,
  trackInventory: true,
  inventoryQuantity: 100,
  status: 'ACTIVE',
  categoryId: null,
  createdAt: date,
  updatedAt: date,
};
const item: OrderItem = {
  id: 'item-1',
  orderId: 'order-1',
  productId,
  productTitle: 'Product',
  sku: null,
  quantity: 3,
  unitPrice: new Decimal(15),
  totalPrice: new Decimal(45),
};
const user: User = {
  id: 'user-1',
  storeId,
  firstName: 'Ana',
  lastName: null,
  email: null,
  phone: null,
  password: null,
  avatarUrl: null,
  isShopOwner: false,
  isActive: true,
  posPinEncrypted: null,
  posPinLookup: null,
  role: 'CASHIER',
  createdAt: date,
  updatedAt: date,
};
const orderFixture = (): Order => ({
  id: 'order-1',
  storeId,
  userId: user.id,
  locationId: 'location-1',
  customerId: null,
  orderNumber: 1001n,
  orderName: '#1001',
  itemCount: 3,
  subtotalPrice: new Decimal(45),
  discountAmount: new Decimal(5),
  discountReason: 'Promotion',
  totalPrice: new Decimal(40),
  email: null,
  phone: null,
  note: null,
  financialStatus: 'PENDING',
  status: 'OPEN',
  cancelReason: null,
  cancelledAt: null,
  paidAt: null,
  closedAt: null,
  createdAt: date,
  updatedAt: date,
});

describe('Order discounts', () => {
  let current: Order;
  let payments: { amount: Decimal }[];
  let module: TestingModule;
  let service: OrdersService;
  const transactionToken = Symbol('transaction');
  const tx = {
    storeSetting: { update: vi.fn() },
    location: { findFirst: vi.fn() },
    customer: { findFirst: vi.fn() },
    product: { findMany: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    order: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    orderItem: { findFirst: vi.fn(), update: vi.fn() },
    payment: { count: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  };
  const transaction = vi.fn();
  const result = () => ({
    ...current,
    orderItems: [{ ...item }],
    customer: null,
  });

  beforeEach(async () => {
    vi.resetAllMocks();
    // The existing error helper logs intentional HTTP errors as well.
    vi.spyOn(console, 'log').mockImplementation(() => {});
    current = orderFixture();
    payments = [];
    tx.storeSetting.update.mockResolvedValue({
      nextOrderNumber: 1002n,
      orderPrefix: '#',
      orderSuffix: '',
    });
    tx.location.findFirst.mockResolvedValue({ id: 'location-1' });
    tx.product.findMany.mockResolvedValue([product]);
    tx.product.updateMany.mockResolvedValue({ count: 1 });
    tx.order.findFirst.mockImplementation(async () => result());
    for (const write of [tx.order.create, tx.order.update]) {
      write.mockImplementation(async ({ data }: { data: Partial<Order> }) => {
        current = {
          ...current,
          ...Object.fromEntries(
            Object.entries(data).filter(([, value]) => value !== undefined),
          ),
        };
        return result();
      });
    }
    tx.orderItem.findFirst.mockResolvedValue({ ...item, product });
    tx.payment.count.mockImplementation(async () => payments.length);
    tx.payment.findMany.mockImplementation(async () => payments);
    tx.payment.create.mockImplementation(
      async ({ data }: { data: { amount: Decimal } }) => {
        payments.push({ amount: data.amount });
        return data;
      },
    );
    module = await Test.createTestingModule({
      providers: [
        { provide: transactionToken, useValue: tx },
        { provide: PrismaService, useValue: { $transaction: transaction } },
        {
          provide: OrdersService,
          useFactory: (prisma: PrismaService) => new OrdersService(prisma),
          inject: [PrismaService],
        },
      ],
    }).compile();
    transaction.mockImplementation(
      (operation: (client: Prisma.TransactionClient) => Promise<unknown>) =>
        operation(module.get<Prisma.TransactionClient>(transactionToken)),
    );
    service = module.get(OrdersService);
  });
  afterEach(async () => {
    await module.close();
    vi.restoreAllMocks();
  });

  it('creates an order without a discount by default', async () => {
    const created = await service.create(
      { items: [{ productId, quantity: 3 }] },
      user,
    );
    expect(created.subtotalPrice.toString()).toBe('45');
    expect(created.totalPrice.toString()).toBe('45');
    expect(created.discountAmount.toString()).toBe('0');
    expect(created.discountReason).toBeNull();
  });

  it('subtracts a fixed amount without altering historical line amounts', async () => {
    const created = await service.create(
      {
        items: [{ productId, quantity: 3 }],
        discountAmount: 5,
        discountReason: 'Promotion',
      },
      user,
    );
    expect(created.subtotalPrice.toString()).toBe('45');
    expect(created.totalPrice.toString()).toBe('40');
    expect(JSON.parse(JSON.stringify(created))).toMatchObject({
      discountAmount: '5',
      discountReason: 'Promotion',
      subtotalPrice: '45',
      totalPrice: '40',
    });
    expect(
      tx.order.create.mock.calls[0][0].data.orderItems.createMany.data,
    ).toEqual([
      expect.objectContaining({
        unitPrice: new Decimal(15),
        totalPrice: new Decimal(45),
      }),
    ]);
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
  });

  it.each([-1, NaN, Infinity, -Infinity, 0.001, 45, 46])(
    'rejects invalid creation discount %s before inventory or order writes',
    async (discountAmount) => {
      await expect(
        service.create(
          { items: [{ productId, quantity: 3 }], discountAmount },
          user,
        ),
      ).rejects.toMatchObject({ status: 400 });
      expect(tx.product.updateMany).not.toHaveBeenCalled();
      expect(tx.order.create).not.toHaveBeenCalled();
    },
  );

  it('keeps exact decimal arithmetic', async () => {
    tx.product.findMany.mockResolvedValue([
      { ...product, price: new Decimal('0.10') },
    ]);
    const created = await service.create(
      { items: [{ productId, quantity: 3 }], discountAmount: 0.2 },
      user,
    );
    expect(created.subtotalPrice.toString()).toBe('0.3');
    expect(created.totalPrice.toString()).toBe('0.1');
  });

  it('adds a discount to an unpaid order', async () => {
    current = {
      ...current,
      discountAmount: new Decimal(0),
      discountReason: null,
      totalPrice: new Decimal(45),
    };
    const updated = await service.update(
      current.id,
      { discountAmount: 5, discountReason: 'Promotion' },
      storeId,
    );
    expect(updated.totalPrice.toString()).toBe('40');
    expect(updated.discountReason).toBe('Promotion');
  });

  it('preserves omitted discount fields and only updates the requested note', async () => {
    const updated = await service.update(
      current.id,
      { note: 'New note' },
      storeId,
    );
    expect(updated.note).toBe('New note');
    expect(updated.discountAmount.toString()).toBe('5');
    expect(updated.discountReason).toBe('Promotion');
    expect(tx.payment.count).not.toHaveBeenCalled();
    expect(tx.order.update.mock.calls[0][0].data).not.toHaveProperty(
      'totalPrice',
    );
  });

  it('changes the amount while preserving an omitted reason', async () => {
    const updated = await service.update(
      current.id,
      { discountAmount: 10 },
      storeId,
    );
    expect(updated.totalPrice.toString()).toBe('35');
    expect(updated.discountReason).toBe('Promotion');
  });

  it('clears only the reason when explicitly null', async () => {
    const updated = await service.update(
      current.id,
      { discountReason: null },
      storeId,
    );
    expect(updated.discountAmount.toString()).toBe('5');
    expect(updated.totalPrice.toString()).toBe('40');
    expect(updated.discountReason).toBeNull();
  });

  it.each([{}, { discountReason: 'Ignored reason' }, { discountReason: null }])(
    'clears the amount and reason when the amount is zero (%j)',
    async (fields) => {
      const updated = await service.update(
        current.id,
        { ...fields, discountAmount: 0 },
        storeId,
      );
      expect(updated.discountAmount.toString()).toBe('0');
      expect(updated.discountReason).toBeNull();
      expect(updated.totalPrice.toString()).toBe('45');
    },
  );

  it('does not store a reason for a zero discount', async () => {
    const created = await service.create(
      { items: [{ productId, quantity: 3 }], discountReason: 'Ignored reason' },
      user,
    );
    expect(created.discountReason).toBeNull();
    const updated = await service.update(
      current.id,
      { discountReason: 'Still ignored' },
      storeId,
    );
    expect(updated.discountReason).toBeNull();
  });

  it.each([-1, NaN, Infinity, 1.001, 45, 46])(
    'rejects invalid update discount %s without writing',
    async (discountAmount) => {
      await expect(
        service.update(current.id, { discountAmount }, storeId),
      ).rejects.toMatchObject({ status: 400 });
      expect(tx.order.update).not.toHaveBeenCalled();
    },
  );

  it('preserves the discount and historical prices when adding items', async () => {
    tx.product.findMany.mockResolvedValue([
      { ...product, price: new Decimal(20) },
    ]);
    const updated = await service.addItems(current.id, storeId, {
      productIds: [productId],
    });
    expect(updated.subtotalPrice.toString()).toBe('65');
    expect(updated.totalPrice.toString()).toBe('60');
    expect(updated.discountAmount.toString()).toBe('5');
    expect(updated.discountReason).toBe('Promotion');
    expect(
      tx.order.update.mock.calls[0][0].data.orderItems.createMany.data[0].unitPrice.toString(),
    ).toBe('20');
  });

  it('preserves the discount when a quantity reduction remains valid', async () => {
    const updated = await service.editItemQuantity(
      current.id,
      item.id,
      { quantity: 2, restock: true },
      storeId,
    );
    expect(updated.subtotalPrice.toString()).toBe('30');
    expect(updated.totalPrice.toString()).toBe('25');
    expect(updated.discountAmount.toString()).toBe('5');
    expect(tx.product.update).toHaveBeenCalledWith({
      where: { id: productId, storeId },
      data: { inventoryQuantity: { increment: 1 } },
    });
  });

  it.each([30, 35])(
    'rejects a quantity reduction invalidating discount %s before any writes',
    async (amount) => {
      current.discountAmount = new Decimal(amount);
      current.totalPrice = current.subtotalPrice.minus(amount);
      const before = { ...current };
      await expect(
        service.editItemQuantity(
          current.id,
          item.id,
          { quantity: 2, restock: true },
          storeId,
        ),
      ).rejects.toMatchObject({
        status: 400,
        message: expect.stringContaining('menor que el subtotal'),
      });
      expect(tx.orderItem.update).not.toHaveBeenCalled();
      expect(tx.product.update).not.toHaveBeenCalled();
      expect(tx.product.updateMany).not.toHaveBeenCalled();
      expect(tx.order.update).not.toHaveBeenCalled();
      expect(current).toEqual(before);
      await expect(transaction.mock.results[0].value).rejects.toMatchObject({
        status: 400,
      });
    },
  );

  it.each([
    { status: 'CLOSED', financialStatus: 'PAID' },
    { status: 'CANCELLED', financialStatus: 'VOIDED' },
    { status: 'OPEN', financialStatus: 'PARTIALLY_PAID' },
  ] as const)(
    'blocks discount changes in $status / $financialStatus but allows notes',
    async (state) => {
      Object.assign(current, state);
      await expect(
        service.update(current.id, { discountAmount: 1 }, storeId),
      ).rejects.toMatchObject({ status: 400 });
      await expect(
        service.update(current.id, { discountReason: null }, storeId),
      ).rejects.toMatchObject({ status: 400 });
      expect(tx.order.update).not.toHaveBeenCalled();
      const updated = await service.update(
        current.id,
        { note: 'Contact customer' },
        storeId,
      );
      expect(updated.note).toBe('Contact customer');
    },
  );

  it('blocks discount changes when payments exist even if financial status is pending', async () => {
    payments.push({ amount: new Decimal(1) });
    await expect(
      service.update(current.id, { discountAmount: 0 }, storeId),
    ).rejects.toMatchObject({ status: 400 });
    expect(tx.order.update).not.toHaveBeenCalled();
  });

  it('does not modify an order from another store', async () => {
    tx.order.findFirst.mockResolvedValue(null);
    await expect(
      service.update(current.id, { discountAmount: 1 }, 'other-store'),
    ).rejects.toMatchObject({ status: 404 });
    expect(tx.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: current.id, storeId: 'other-store' },
      }),
    );
    expect(tx.order.update).not.toHaveBeenCalled();
  });

  it('rechecks payment eligibility after a simulated serialization conflict', async () => {
    tx.order.update.mockImplementationOnce(async () => {
      payments.push({ amount: new Decimal(1) });
      throw new PrismaClientKnownRequestError('Serialization conflict', {
        code: 'P2034',
        clientVersion: '7.10.0',
      });
    });
    await expect(
      service.update(current.id, { discountAmount: 10 }, storeId),
    ).rejects.toMatchObject({ status: 400 });
    expect(transaction).toHaveBeenCalledTimes(2);
    expect(tx.payment.count).toHaveBeenCalledTimes(2);
    expect(current.discountAmount.toString()).toBe('5');
  });

  it('accepts full payment of the discounted total and closes the order', async () => {
    const payment = await service.addPayment(current.id, storeId, {
      amount: 40,
      method: 'CASH',
    });
    expect(payment.remainingBalance.toString()).toBe('0');
    expect(current.status).toBe('CLOSED');
    expect(current.financialStatus).toBe('PAID');
    expect(current.paidAt).toBeInstanceOf(Date);
    expect(current.closedAt).toBeInstanceOf(Date);
  });

  it('rejects payment based on the undiscounted subtotal', async () => {
    await expect(
      service.addPayment(current.id, storeId, { amount: 45, method: 'CASH' }),
    ).rejects.toMatchObject({ status: 400 });
    expect(tx.payment.create).not.toHaveBeenCalled();
  });

  it('accepts split payments, locks economic changes after the first and closes at 40', async () => {
    const first = await service.addPayment(current.id, storeId, {
      amount: 15,
      method: 'CASH',
    });
    expect(first.remainingBalance.toString()).toBe('25');
    expect(current.status).toBe('OPEN');
    expect(current.financialStatus).toBe('PARTIALLY_PAID');
    await expect(
      service.update(current.id, { discountAmount: 0 }, storeId),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.addItems(current.id, storeId, { productIds: [productId] }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.editItemQuantity(current.id, item.id, { quantity: 2 }, storeId),
    ).rejects.toMatchObject({ status: 400 });
    const final = await service.addPayment(current.id, storeId, {
      amount: 25,
      method: 'CARD',
    });
    expect(final.remainingBalance.toString()).toBe('0');
    expect(current.status).toBe('CLOSED');
    expect(current.financialStatus).toBe('PAID');
  });
});

describe.each([CreateOrderDto, UpdateOrderDto])(
  '%s discount validation',
  (Dto) => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    const validate = (fields: Record<string, unknown>) =>
      pipe.transform(
        {
          ...(Dto === CreateOrderDto
            ? { items: [{ productId, quantity: 3 }] }
            : {}),
          ...fields,
        },
        { type: 'body', metatype: Dto },
      );

    it.each([null, -1, NaN, Infinity, -Infinity, 0.001, '5'])(
      'rejects invalid amount %s',
      async (discountAmount) => {
        await expect(validate({ discountAmount })).rejects.toMatchObject({
          status: 400,
        });
      },
    );
    it.each([
      {},
      { discountAmount: 0 },
      { discountAmount: 5.25 },
      { discountReason: null },
      { discountReason: 'a'.repeat(250) },
    ])('accepts optional fields and valid values (%j)', async (fields) => {
      await expect(validate(fields)).resolves.toMatchObject(fields);
    });
    it.each([123, 'a'.repeat(251)])(
      'rejects an invalid reason (%s)',
      async (discountReason) => {
        await expect(validate({ discountReason })).rejects.toMatchObject({
          status: 400,
        });
      },
    );
    it('rejects client-calculated totals', async () => {
      await expect(
        validate({ totalPrice: 1, subtotalPrice: 1 }),
      ).rejects.toMatchObject({ status: 400 });
    });
  },
);
