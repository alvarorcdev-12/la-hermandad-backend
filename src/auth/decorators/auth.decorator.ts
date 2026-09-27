import { ApiBearerAuth, ApiExtension, ApiResponse } from '@nestjs/swagger';
import { ref } from '../../common/openapi/schemas.js';
import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { UserRoleGuard } from '../guards/user-role/user-role.guard.js';
import { RoleProtected } from './role-protected.decorator.js';
import { Role } from '../../generated/prisma/enums.js';

export function Auth(...args: Role[]) {
  return applyDecorators(
    ApiBearerAuth(),
    ApiExtension(
      'x-roles',
      args.length ? args : ['OWNER', 'MANAGER', 'CASHIER'],
    ),
    ApiResponse({
      status: 401,
      description:
        'JWT ausente, inválido o vencido; usuario inexistente o inactivo.',
      schema: ref('Error'),
    }),
    ...(args.length
      ? [
          ApiResponse({
            status: 403,
            description: `Requiere uno de estos roles: ${args.join(', ')}.`,
            schema: ref('Error'),
          }),
        ]
      : []),
    RoleProtected(...args),
    UseGuards(AuthGuard(), UserRoleGuard),
  );
}
