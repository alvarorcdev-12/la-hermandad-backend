import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { UserRoleGuard } from '../guards/user-role/user-role.guard';
import { RoleProtected } from './role-protected.decorator';
import { Role } from 'src/generated/prisma/enums';

export function Auth(...args: Role[]) {
  return applyDecorators(
    RoleProtected(...args),
    UseGuards(AuthGuard(), UserRoleGuard),
  );
}
