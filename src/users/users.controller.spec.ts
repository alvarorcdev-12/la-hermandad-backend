import 'reflect-metadata';
import { GUARDS_METADATA, HEADERS_METADATA } from '@nestjs/common/constants';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { UsersController } from './users.controller.js';
import { UserRoleGuard } from '../auth/guards/user-role/user-role.guard.js';
import { META_ROLES } from '../auth/decorators/role-protected.decorator.js';

describe('PIN generation authorization', () => {
  const handler = UsersController.prototype.generatePin;
  const context = (role?: string) =>
    new ExecutionContextHost(
      [
        {
          headers: {},
          ...(role ? { user: { role, storeId: 'store-a' } } : {}),
        },
        {},
      ],
      UsersController,
      handler,
    );

  it('uses the existing authentication and role guards with OWNER only', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
      AuthGuard(),
      UserRoleGuard,
    ]);
    expect(Reflect.getMetadata(META_ROLES, handler)).toEqual(['OWNER']);
    expect(
      new UserRoleGuard(new Reflector()).canActivate(context('OWNER')),
    ).toBe(true);
  });

  it.each(['MANAGER', 'CASHIER'])(
    'forbids %s with the real role guard',
    (role) => {
      expect(() =>
        new UserRoleGuard(new Reflector()).canActivate(context(role)),
      ).toThrow(expect.objectContaining({ status: 403 }));
    },
  );

  it('returns 401 through the real authentication guard for missing credentials', () => {
    const guard = new (AuthGuard())();
    expect(() => guard.handleRequest(null, false, null, context())).toThrow(
      expect.objectContaining({ status: 401 }),
    );
  });

  it('prevents caching the generated PIN', () => {
    expect(Reflect.getMetadata(HEADERS_METADATA, handler)).toContainEqual({
      name: 'Cache-Control',
      value: 'no-store',
    });
  });
});
