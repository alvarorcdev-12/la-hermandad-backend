import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { UserRoleGuard } from '../guards/user-role/user-role.guard.js';
import { RoleProtected } from './role-protected.decorator.js';
import { Role } from '../../generated/prisma/enums.js';

export function Auth(...args: Role[]) {
  return applyDecorators(
    RoleProtected(...args),
    UseGuards(AuthGuard(), UserRoleGuard),
  );
}
