import { ApiBearerAuth, ApiExtension } from '@nestjs/swagger';
import { ApiErrors } from '../../common/openapi/api-response.decorator.js';
import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { UserRoleGuard } from '../guards/user-role/user-role.guard.js';
import { RoleProtected } from './role-protected.decorator.js';
import { Role } from '../../generated/prisma/enums.js';

export function Auth(...args: Role[]) {
  return applyDecorators(
    ApiBearerAuth('bearer'),
    ApiExtension('x-roles', args.length ? args : Object.values(Role)),
    ApiErrors({
      401: 'JWT ausente, inválido o vencido; usuario inexistente o inactivo.',
      ...(args.length
        ? { 403: `Se requiere uno de estos roles: ${args.join(', ')}.` }
        : {}),
    }),
    RoleProtected(...args),
    UseGuards(AuthGuard(), UserRoleGuard),
  );
}
